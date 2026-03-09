from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from fastapi import HTTPException
from app.models.ledger import LedgerEntry, LedgerEntryType
from app.models.movement import MovementRequest, MovementStatus, MovementType, MovementRequestItem
from app.models.product_location_models import ProductLocationAssignment, AssignmentType
from app.models.product import Product, ProductBatch
from app.core.cache import stock_cache
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.services.websocket_service import manager
from app.services.purchase_service import PurchaseService

from app.models.location_models import StorageLocation

class StockService:
    
    @staticmethod
    async def _resolve_location(db: Session, product_id: int, warehouse_id: int, quantity: int, type: str) -> int:
        """
        Auto-assign location strategy.
        IN: Consolidate -> Empty
        OUT: First with enough stock
        """
        if type == "IN":
            # 1. Consolidate: Find locations with same product and available capacity
            existing = db.query(ProductLocationAssignment).join(StorageLocation).filter(
                ProductLocationAssignment.product_id == product_id,
                ProductLocationAssignment.warehouse_id == warehouse_id,
                StorageLocation.is_restricted == False
            ).all()
            
            for assignment in existing:
                loc = assignment.location
                current_usage = db.query(func.sum(ProductLocationAssignment.quantity)).filter(
                    ProductLocationAssignment.location_id == loc.id
                ).scalar() or 0
                
                if loc.capacity is None or (current_usage + quantity <= loc.capacity):
                    return loc.id
            
            # 2. Empty: Find first empty location in warehouse
            # This is a bit complex query-wise, simplified: Find locations with NO assignments
            # Or just find any location with capacity
            # For simplicity/performance: Find a location in this warehouse that is not restricted
            candidates = db.query(StorageLocation).filter(
                StorageLocation.warehouse_id == warehouse_id,
                StorageLocation.is_restricted == False
            ).limit(50).all() # Limit to avoid scanning all
            
            for loc in candidates:
                current_usage = db.query(func.sum(ProductLocationAssignment.quantity)).filter(
                    ProductLocationAssignment.location_id == loc.id
                ).scalar() or 0
                 
                if loc.capacity is None or (current_usage + quantity <= loc.capacity):
                    return loc.id
            
            raise ValueError(f"No suitable location found in warehouse {warehouse_id} for product {product_id}")

        elif type == "OUT":
            # Find location with enough stock
            assignment = db.query(ProductLocationAssignment).filter(
                ProductLocationAssignment.product_id == product_id,
                ProductLocationAssignment.warehouse_id == warehouse_id,
                ProductLocationAssignment.quantity >= quantity
            ).order_by(ProductLocationAssignment.quantity.desc()).first()
            
            if assignment:
                return assignment.location_id
                
            raise ValueError(f"No single location in warehouse {warehouse_id} has enough stock ({quantity}) for product {product_id}")
            
        return None

    @staticmethod
    async def apply_movement(db: Session, movement_request_id: int, user_id: int) -> Dict[str, Any]:
        """
        Apply an APPROVED movement request to the stock ledger and update real-time assignments.
        """
        # 1. Get and validate request
        request = db.query(MovementRequest).filter(MovementRequest.id == movement_request_id).first()
        if not request:
            raise HTTPException(status_code=404, detail="Movement request not found")
        
        if request.status != MovementStatus.APPROVED:
             if request.status == MovementStatus.APPLIED or request.status == MovementStatus.COMPLETED:
                 raise HTTPException(status_code=400, detail="Movement already applied")
             raise HTTPException(status_code=400, detail=f"Movement status must be APPROVED, found {request.status}")

        # 2. Process items
        items_updated = []
        try:
            for item in request.items:
                updated_item = await StockService._process_item(db, request, item, user_id)
                if updated_item:
                    items_updated.append(updated_item)
            
            # 3. Update Request Status
            request.status = MovementStatus.APPLIED
            db.add(request)
            
            db.commit()
            db.refresh(request)
            
            # Broadcast event
            await manager.broadcast({
                "type": "movement_applied",
                "data": {
                    "movement_id": request.id,
                    "type": request.type,
                    "items": items_updated
                }
            })

            return {"message": "Movement applied successfully", "request_id": request.id, "status": request.status}
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error applying movement: {str(e)}")

    @staticmethod
    async def _process_item(db: Session, request: MovementRequest, item: MovementRequestItem, user_id: int) -> Optional[Dict]:
        """
        Process a single item based on movement type.
        """
        # Lock Product Row for Concurrency Control
        _ = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()

        m_type = request.type
        updates = []
        
        # Logic Mapping
        if m_type == MovementType.IN:
            if not request.destination_warehouse_id:
                raise ValueError("Destination warehouse required for IN movement")
            
            dest_loc_id = item.destination_location_id
            if not dest_loc_id:
                dest_loc_id = await StockService._resolve_location(
                    db, item.product_id, request.destination_warehouse_id, item.quantity, "IN"
                )
            
            upd = await StockService._update_stock(
                db=db,
                request=request,
                item=item,
                warehouse_id=request.destination_warehouse_id,
                location_id=dest_loc_id,
                quantity=item.quantity,
                entry_type=LedgerEntryType.INCREMENT,
                user_id=user_id
            )
            updates.append(upd)
            
        elif m_type == MovementType.OUT:
            if not request.source_warehouse_id:
                raise ValueError("Source warehouse required for OUT movement")
                
            source_loc_id = item.source_location_id
            if not source_loc_id:
                source_loc_id = await StockService._resolve_location(
                    db, item.product_id, request.source_warehouse_id, item.quantity, "OUT"
                )

            upd = await StockService._update_stock(
                db=db,
                request=request,
                item=item,
                warehouse_id=request.source_warehouse_id,
                location_id=source_loc_id,
                quantity=item.quantity,
                entry_type=LedgerEntryType.DECREMENT,
                user_id=user_id
            )
            updates.append(upd)
            
        elif m_type == MovementType.TRANSFER:
            if not request.source_warehouse_id or not request.destination_warehouse_id:
                raise ValueError("Both source and destination warehouses required for TRANSFER")
                
            source_loc_id = item.source_location_id
            if not source_loc_id:
                source_loc_id = await StockService._resolve_location(
                    db, item.product_id, request.source_warehouse_id, item.quantity, "OUT"
                )

            upd1 = await StockService._update_stock(
                db=db,
                request=request,
                item=item,
                warehouse_id=request.source_warehouse_id,
                location_id=source_loc_id,
                quantity=item.quantity,
                entry_type=LedgerEntryType.DECREMENT,
                user_id=user_id
            )
            updates.append(upd1)
            
            dest_loc_id = item.destination_location_id
            if not dest_loc_id:
                dest_loc_id = await StockService._resolve_location(
                    db, item.product_id, request.destination_warehouse_id, item.quantity, "IN"
                )

            upd2 = await StockService._update_stock(
                db=db,
                request=request,
                item=item,
                warehouse_id=request.destination_warehouse_id,
                location_id=dest_loc_id,
                quantity=item.quantity,
                entry_type=LedgerEntryType.INCREMENT,
                user_id=user_id
            )
            updates.append(upd2)
            
        elif m_type == MovementType.ADJUSTMENT:
            if request.source_warehouse_id:
                 upd = await StockService._update_stock(
                    db=db,
                    request=request,
                    item=item,
                    warehouse_id=request.source_warehouse_id,
                    location_id=item.source_location_id,
                    quantity=item.quantity,
                    entry_type=LedgerEntryType.DECREMENT,
                    user_id=user_id
                )
                 updates.append(upd)
            
            if request.destination_warehouse_id:
                 upd = await StockService._update_stock(
                    db=db,
                    request=request,
                    item=item,
                    warehouse_id=request.destination_warehouse_id,
                    location_id=item.destination_location_id,
                    quantity=item.quantity,
                    entry_type=LedgerEntryType.INCREMENT,
                    user_id=user_id
                )
                 updates.append(upd)
        
        # Invalidate Cache for this product (all scopes)
        stock_cache.delete_pattern(f"stock:{item.product_id}:")
        
        return {
            "product_id": item.product_id,
            "updates": updates
        }

    @staticmethod
    async def _update_stock(
        db: Session,
        request: MovementRequest,
        item: MovementRequestItem,
        warehouse_id: int,
        location_id: Optional[int],
        quantity: int,
        entry_type: LedgerEntryType,
        user_id: int
    ) -> Dict:
        """
        Core logic: Create LedgerEntry and update ProductLocationAssignment
        """
        # Calculate current stock WITHOUT cache to ensure fresh data inside transaction
        current_wh_stock = StockService._calculate_current_stock_db(db, item.product_id, warehouse_id)
        
        previous_balance = current_wh_stock
        if entry_type == LedgerEntryType.INCREMENT:
            new_balance = previous_balance + quantity
        else:
            new_balance = previous_balance - quantity
            # Negative Stock Validation (Already covered by logic below, but kept for warehouse level safety)
            if new_balance < 0:
                 raise ValueError(f"Insufficient stock for product {item.product_id} in warehouse {warehouse_id}. Current: {previous_balance}, Requested: {quantity}")

        # Create Ledger Entry
        ledger_entry = LedgerEntry(
            movement_request_id=request.id,
            product_id=item.product_id,
            batch_id=item.batch_id,
            warehouse_id=warehouse_id,
            location_id=location_id,
            entry_type=entry_type,
            quantity=quantity,
            previous_balance=previous_balance,
            new_balance=new_balance,
            applied_by=user_id
        )
        db.add(ledger_entry)
        
        # Update Real-Time Location Assignment
        if location_id:
            assignment = db.query(ProductLocationAssignment).filter(
                ProductLocationAssignment.location_id == location_id,
                ProductLocationAssignment.product_id == item.product_id,
                ProductLocationAssignment.batch_id == item.batch_id
            ).first()
            
            if entry_type == LedgerEntryType.INCREMENT:
                if assignment:
                    assignment.quantity += quantity
                else:
                    assignment = ProductLocationAssignment(
                        product_id=item.product_id,
                        batch_id=item.batch_id,
                        location_id=location_id,
                        warehouse_id=warehouse_id,
                        quantity=quantity,
                        assignment_type=AssignmentType.MOVEMENT,
                        assigned_by=user_id
                    )
                    db.add(assignment)
            else: # DECREMENT
                if not assignment:
                     raise ValueError(f"No stock found in location {location_id} to decrement")
                
                if assignment.quantity < quantity:
                     raise ValueError(f"Insufficient stock in location {location_id}. Found {assignment.quantity}, need {quantity}")
                
                assignment.quantity -= quantity
                if assignment.quantity == 0:
                    db.delete(assignment) # Clean up empty assignments? Or keep as 0? Usually cleanup to keep table small.
        
        # Check Low Stock
        if entry_type == LedgerEntryType.DECREMENT:
            # We don't check low stock here, it should be done in purchase service or separate task
            # to avoid circular imports or complexity. But if required:
            # PurchaseService.check_low_stock(db, item.product_id, new_balance)
            pass

        # Emit real-time stock update
        await manager.broadcast({
            "type": "stock_updated",
            "data": {
                "product_id": item.product_id,
                "warehouse_id": warehouse_id,
                "location_id": location_id,
                "new_balance": new_balance,
                "change": quantity if entry_type == LedgerEntryType.INCREMENT else -quantity
            }
        })
        
        return {
            "warehouse_id": warehouse_id,
            "location_id": location_id,
            "new_balance": new_balance
        }


    @staticmethod
    def calculate_current_stock(db: Session, product_id: int, warehouse_id: Optional[int] = None, location_id: Optional[int] = None) -> int:
        """
        Calculate stock with caching.
        """
        cache_key = f"stock:{product_id}:{warehouse_id}:{location_id}"
        cached_val = stock_cache.get(cache_key)
        if cached_val is not None:
            return cached_val
            
        val = StockService._calculate_current_stock_db(db, product_id, warehouse_id, location_id)
        stock_cache.set(cache_key, val)
        return val

    @staticmethod
    def _calculate_current_stock_db(db: Session, product_id: int, warehouse_id: Optional[int] = None, location_id: Optional[int] = None) -> int:
        """
        Direct DB calculation (Ledger Sum)
        """
        query = db.query(LedgerEntry).filter(LedgerEntry.product_id == product_id)
        
        if warehouse_id:
            query = query.filter(LedgerEntry.warehouse_id == warehouse_id)
        
        if location_id:
            query = query.filter(LedgerEntry.location_id == location_id)
            
        entries = query.all()
        
        total = 0
        for entry in entries:
            if entry.entry_type == LedgerEntryType.INCREMENT:
                total += entry.quantity
            else:
                total -= entry.quantity
        
        return total

    @staticmethod
    def validate_stock_availability(db: Session, product_id: int, warehouse_id: int, quantity: int, location_id: Optional[int] = None):
        """
        Validate if enough stock exists. Raises error if not.
        """
        current = StockService.calculate_current_stock(db, product_id, warehouse_id, location_id)
        if current < quantity:
             scope = f"in location {location_id}" if location_id else f"in warehouse {warehouse_id}"
             raise ValueError(f"Insufficient stock {scope}. Available: {current}, Requested: {quantity}")
        return True

    @staticmethod
    def get_stock_history(db: Session, product_id: int) -> List[LedgerEntry]:
        return db.query(LedgerEntry).filter(LedgerEntry.product_id == product_id).order_by(LedgerEntry.applied_at.desc()).all()
