from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from pydantic import BaseModel
from app.api import deps
from app.crud import product as crud_product
from app.services.stock_service import StockService
from app.models.user import User
from app.models.product import Product, ProductBatch
from app.models.warehouse import Warehouse
from app.models.location_models import StorageLocation
from app.models.product_location_models import ProductLocationAssignment
from app.models.movement import MovementRequest, MovementRequestItem, MovementType, MovementStatus, MovementPriority
from app.schemas.inventory import (
    ScanRequest, ScanResult,
    ReceiveRequest, ReceiveResponse, ReceiveItem,
    LocationCapacityUpdate, LocationCapacityResponse,
    ProductLocationInfo,
    TransferRequest, TransferResponse, TransferItem,
    TransferHistoryResponse, TransferHistoryItem,
    CycleCountCreate, CycleCountResponse, CycleCountDetailResponse, CycleCountListResponse,
    CycleCountItemResponse, CycleCountStatus, CycleCountPriority, VarianceApprovalRequest,
    ExpiringProductsResponse, ExpiringProductItem,
    LowStockResponse, LowStockItem,
    InventorySummaryResponse, InventorySummaryCategory, InventorySummaryWarehouse
)
from app.schemas.product_location import ProductLocationAssignmentResponse

router = APIRouter()


def get_required_roles(max_role_id: int = 4):
    """Helper to require roles 1-4 (not visitor)"""
    def dependency(
        db: Session = Depends(deps.get_db),
        current_user: User = Depends(deps.get_current_user)
    ):
        if current_user.role_id > max_role_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return current_user
    return dependency


@router.post("/scan", response_model=ScanResult)
def scan_product_or_location(
    request: ScanRequest,
    warehouse_id: Optional[int] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Scan a product by SKU, barcode, or scan a location by code.
    Returns product info with current stock and locations.
    """
    code = request.code.strip()
    
    # Try to find product by SKU or barcode
    product = crud_product.get_product_by_sku(db, sku=code)
    if not product:
        product = crud_product.get_product_by_barcode(db, barcode=code)
    
    if product:
        # Calculate current stock
        current_stock = StockService.calculate_current_stock(db, product.id, warehouse_id)
        
        # Get locations for this product
        locations = []
        query = db.query(ProductLocationAssignment).filter(
            ProductLocationAssignment.product_id == product.id
        )
        if warehouse_id:
            query = query.filter(ProductLocationAssignment.warehouse_id == warehouse_id)
        
        for assignment in query.all():
            loc = db.query(StorageLocation).filter(StorageLocation.id == assignment.location_id).first()
            warehouse = db.query(Warehouse).filter(Warehouse.id == assignment.warehouse_id).first()
            
            if loc:
                locations.append({
                    "location_id": loc.id,
                    "location_code": loc.code,
                    "warehouse_name": warehouse.name if warehouse else "Unknown",
                    "quantity": assignment.quantity,
                    "batch_number": None,
                    "expiration_date": None,
                    "is_primary": assignment.is_primary
                })
        
        return ScanResult(
            found=True,
            product_id=product.id,
            sku=product.sku,
            barcode=product.barcode,
            name=product.name,
            brand=product.brand,
            model=product.model,
            category=product.category.name if product.category else None,
            unit=product.unit.abbreviation if product.unit else None,
            current_stock=current_stock,
            min_stock=product.min_stock or 0,
            has_batch=product.has_batch,
            has_expiration=product.has_expiration,
            locations=locations
        )
    
    # Try to find location by code
    location = db.query(StorageLocation).filter(StorageLocation.code == code).first()
    if location:
        warehouse = db.query(Warehouse).filter(Warehouse.id == location.warehouse_id).first()
        
        # Get products at this location
        assignments = db.query(ProductLocationAssignment).filter(
            ProductLocationAssignment.location_id == location.id
        ).all()
        
        products = []
        for assignment in assignments:
            p = db.query(Product).filter(Product.id == assignment.product_id).first()
            if p:
                products.append({
                    "location_id": location.id,
                    "location_code": location.code,
                    "warehouse_name": warehouse.name if warehouse else "Unknown",
                    "quantity": assignment.quantity,
                    "batch_number": None,
                    "expiration_date": None,
                    "is_primary": assignment.is_primary
                })
        
        return ScanResult(
            found=True,
            product_id=None,
            sku=None,
            barcode=None,
            name=f"Ubicación: {location.name}",
            brand=None,
            model=None,
            category=None,
            unit=None,
            current_stock=sum(p["quantity"] for p in products),
            min_stock=0,
            has_batch=False,
            has_expiration=False,
            locations=products
        )
    
    # Not found
    return ScanResult(
        found=False,
        product_id=None,
        sku=code,
        barcode=code
    )


@router.post("/receive", response_model=ReceiveResponse)
async def receive_merchandise(
    request: ReceiveRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_required_roles())
):
    """
    Receive merchandise into the warehouse.
    Creates a movement request of type IN and auto-applies it.
    Requires roles 1-4 (not visitor).
    """
    # Verify warehouse exists
    warehouse = db.query(Warehouse).filter(Warehouse.id == request.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    if not warehouse.is_active:
        raise HTTPException(status_code=400, detail="Warehouse is not active")
    
    # Create movement request
    request_number = f"IN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    movement_request = MovementRequest(
        request_number=request_number,
        type=MovementType.IN,
        status=MovementStatus.DRAFT,
        destination_warehouse_id=request.warehouse_id,
        reference=request.reference,
        reason=request.notes,
        requested_by=current_user.id,
        priority=MovementPriority.NORMAL
    )
    db.add(movement_request)
    db.flush()  # Get the ID
    
    # Create items
    total_items = 0
    for item in request.items:
        # Verify product exists
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        # Handle batch if provided
        batch_id = None
        if item.batch_number and product.has_batch:
            batch = db.query(ProductBatch).filter(
                ProductBatch.product_id == product.id,
                ProductBatch.batch_number == item.batch_number
            ).first()
            
            if not batch:
                # Create batch
                batch = ProductBatch(
                    product_id=product.id,
                    batch_number=item.batch_number,
                    expiration_date=item.expiration_date,
                    quantity=0
                )
                db.add(batch)
                db.flush()
            
            batch_id = batch.id
        
        # Create movement item
        movement_item = MovementRequestItem(
            request_id=movement_request.id,
            product_id=item.product_id,
            batch_id=batch_id,
            quantity=item.quantity,
            destination_location_id=item.location_id,
            status="PENDING"
        )
        db.add(movement_item)
        total_items += 1
    
    # Submit and approve (for direct receive, we auto-approve)
    movement_request.status = MovementStatus.PENDING
    movement_request.approved_by = current_user.id
    movement_request.approval_notes = "Auto-aprobado para recepción directa"
    
    db.commit()
    db.refresh(movement_request)
    
    # Auto-apply the movement
    try:
        result = await StockService.apply_movement(db, movement_request.id, current_user.id)
        return ReceiveResponse(
            success=True,
            movement_request_id=movement_request.id,
            request_number=movement_request.request_number,
            items_received=total_items,
            message="Mercancía recibida exitosamente"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error applying movement: {str(e)}")


@router.put("/locations/{location_id}/capacity", response_model=LocationCapacityResponse)
def update_location_capacity(
    location_id: int,
    request: LocationCapacityUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Update the capacity of a location.
    Requires roles 1-3 (Admin/Moderator level).
    """
    if current_user.role_id > 3:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    location = db.query(StorageLocation).filter(StorageLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Calculate current occupancy
    current_occupancy = db.query(func.sum(ProductLocationAssignment.quantity)).filter(
        ProductLocationAssignment.location_id == location_id
    ).scalar() or 0
    
    # Update capacity
    location.capacity = request.capacity
    location.current_occupancy = current_occupancy
    
    db.add(location)
    db.commit()
    db.refresh(location)
    
    return LocationCapacityResponse(
        id=location.id,
        code=location.code,
        name=location.name,
        capacity=location.capacity or 0,
        current_occupancy=location.current_occupancy,
        available=(location.capacity or 0) - location.current_occupancy
    )


@router.get("/locations/{location_id}/capacity", response_model=LocationCapacityResponse)
def get_location_capacity(
    location_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get capacity info for a location.
    """
    location = db.query(StorageLocation).filter(StorageLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Calculate current occupancy
    current_occupancy = db.query(func.sum(ProductLocationAssignment.quantity)).filter(
        ProductLocationAssignment.location_id == location_id
    ).scalar() or 0
    
    return LocationCapacityResponse(
        id=location.id,
        code=location.code,
        name=location.name,
        capacity=location.capacity or 0,
        current_occupancy=current_occupancy,
        available=(location.capacity or 0) - current_occupancy
    )


@router.get("/product/{product_id}/locations", response_model=List[ProductLocationAssignmentResponse])
def get_product_locations(
    product_id: int,
    warehouse_id: Optional[int] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get all locations where a product is stored.
    """
    product = crud_product.get_product(db, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    query = db.query(ProductLocationAssignment).filter(
        ProductLocationAssignment.product_id == product_id
    )
    
    if warehouse_id:
        query = query.filter(ProductLocationAssignment.warehouse_id == warehouse_id)
    
    assignments = query.all()
    return assignments


@router.get("/warehouses", response_model=List[dict])
def get_warehouses_with_stock(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get all active warehouses with basic info.
    """
    warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).all()
    return [
        {
            "id": w.id,
            "code": w.code,
            "name": w.name,
            "location": w.location
        }
        for w in warehouses
    ]


@router.get("/locations/available", response_model=List[dict])
def get_available_locations(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get locations available for storing products in a warehouse.
    Excludes restricted locations and shows capacity info.
    """
    locations = db.query(StorageLocation).filter(
        StorageLocation.warehouse_id == warehouse_id,
        StorageLocation.is_restricted == False
    ).all()
    
    result = []
    for loc in locations:
        # Calculate current usage
        current_usage = db.query(func.sum(ProductLocationAssignment.quantity)).filter(
            ProductLocationAssignment.location_id == loc.id
        ).scalar() or 0
        
        available = (loc.capacity or 999999) - current_usage if loc.capacity else 999999
        
        result.append({
            "id": loc.id,
            "code": loc.code,
            "name": loc.name,
            "path": loc.path,
            "capacity": loc.capacity,
            "current_occupancy": current_usage,
            "available": available,
            "has_capacity": available > 0
        })
    
    # Sort by available capacity
    result.sort(key=lambda x: (not x["has_capacity"], -x["available"]))
    return result


@router.post("/adjust", response_model=AdjustmentResponse)
async def create_adjustment(
    request: AdjustmentRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "inventory:adjust"))
):
    """
    Create an inventory adjustment.
    Requires roles 1-3 with inventory:adjust permission.
    """
    if not request.items:
        raise HTTPException(status_code=400, detail="At least one item is required")

    # Create movement request of type ADJUSTMENT
    request_number = f"ADJ-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    movement_request = MovementRequest(
        request_number=request_number,
        type=MovementType.ADJUSTMENT,
        status=MovementStatus.DRAFT,
        reason=f"Adjustment: {request.reference or 'Manual adjustment'}",
        requested_by=current_user.id,
        priority=MovementPriority.NORMAL
    )
    db.add(movement_request)
    db.flush()

    total_adjustments = 0
    
    for item in request.items:
        # Verify product exists
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        # Verify warehouse exists
        warehouse = db.query(Warehouse).filter(Warehouse.id == item.warehouse_id).first()
        if not warehouse:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Warehouse {item.warehouse_id} not found")
        
        # Calculate current stock
        current_stock = StockService.calculate_current_stock(db, item.product_id, item.warehouse_id)
        
        # Create movement item
        movement_item = MovementRequestItem(
            request_id=movement_request.id,
            product_id=item.product_id,
            quantity=abs(item.quantity),
            source_location_id=item.location_id if item.quantity < 0 else None,
            destination_location_id=item.location_id if item.quantity >= 0 else None,
            notes=f"Reason: {item.reason.value} | {item.notes or ''}",
            status="PENDING"
        )
        db.add(movement_item)
        total_adjustments += 1
    
    # Submit for approval
    movement_request.status = MovementStatus.PENDING
    movement_request.approved_by = current_user.id
    movement_request.approval_notes = f"Adjustment by {current_user.full_name}"
    
    db.commit()
    db.refresh(movement_request)
    
    # Auto-apply the adjustment
    try:
        result = await StockService.apply_movement(db, movement_request.id, current_user.id)
        return AdjustmentResponse(
            success=True,
            movement_request_id=movement_request.id,
            request_number=movement_request.request_number,
            adjustments_count=total_adjustments,
            message="Ajuste de inventario realizado exitosamente"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error applying adjustment: {str(e)}")


@router.get("/adjustments", response_model=AdjustmentHistoryResponse)
def get_adjustment_history(
    product_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    reason: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2], "inventory:view"))
):
    """
    Get adjustment history.
    Requires roles 1-2.
    """
    # Query ledger entries from ADJUSTMENT movements
    from app.models.ledger import LedgerEntry
    
    query = db.query(
        LedgerEntry,
        MovementRequest.request_number,
        MovementRequest.reason,
        Product.name.label("product_name"),
        Product.sku.label("product_sku"),
        Warehouse.name.label("warehouse_name"),
        StorageLocation.code.label("location_code"),
        User.full_name.label("adjusted_by_name")
    ).join(
        MovementRequest, LedgerEntry.movement_request_id == MovementRequest.id
    ).join(
        Product, LedgerEntry.product_id == Product.id
    ).join(
        Warehouse, LedgerEntry.warehouse_id == Warehouse.id
    ).outerjoin(
        StorageLocation, LedgerEntry.location_id == StorageLocation.id
    ).join(
        User, LedgerEntry.applied_by == User.id
    ).filter(
        MovementRequest.type == MovementType.ADJUSTMENT
    )
    
    if product_id:
        query = query.filter(LedgerEntry.product_id == product_id)
    
    if warehouse_id:
        query = query.filter(LedgerEntry.warehouse_id == warehouse_id)
    
    if start_date:
        query = query.filter(LedgerEntry.applied_at >= start_date)
    
    if end_date:
        query = query.filter(LedgerEntry.applied_at <= end_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    query = query.order_by(LedgerEntry.applied_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    results = query.all()
    
    adjustments = []
    for row in results:
        ledger_entry = row[0]
        adjustments.append(AdjustmentHistoryItem(
            id=ledger_entry.id,
            request_number=row.request_number,
            product_id=ledger_entry.product_id,
            product_name=row.product_name,
            product_sku=row.product_sku,
            warehouse_id=ledger_entry.warehouse_id,
            warehouse_name=row.warehouse_name,
            location_code=row.location_code,
            quantity_change=ledger_entry.quantity if ledger_entry.entry_type.value == "increment" else -ledger_entry.quantity,
            previous_stock=ledger_entry.previous_balance,
            new_stock=ledger_entry.new_balance,
            reason=row.reason or "ADJUSTMENT",
            notes=None,
            adjusted_by=ledger_entry.applied_by,
            adjusted_by_name=row.adjusted_by_name,
            created_at=ledger_entry.applied_at
        ))
    
    return AdjustmentHistoryResponse(
        adjustments=adjustments,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/transfer", response_model=TransferResponse)
async def create_transfer(
    request: TransferRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_required_roles())
):
    """
    Transfer products between warehouses or locations.
    Requires roles 1-4 (not visitor).
    """
    if not request.items:
        raise HTTPException(status_code=400, detail="At least one item is required")

    if request.source_warehouse_id == request.destination_warehouse_id:
        raise HTTPException(status_code=400, detail="Source and destination warehouses must be different")

    source_warehouse = db.query(Warehouse).filter(Warehouse.id == request.source_warehouse_id).first()
    if not source_warehouse:
        raise HTTPException(status_code=404, detail="Source warehouse not found")

    dest_warehouse = db.query(Warehouse).filter(Warehouse.id == request.destination_warehouse_id).first()
    if not dest_warehouse:
        raise HTTPException(status_code=404, detail="Destination warehouse not found")

    request_number = f"TR-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    movement_request = MovementRequest(
        request_number=request_number,
        type=MovementType.TRANSFER,
        status=MovementStatus.DRAFT,
        source_warehouse_id=request.source_warehouse_id,
        destination_warehouse_id=request.destination_warehouse_id,
        reference=request.reference,
        reason=request.notes,
        requested_by=current_user.id,
        priority=MovementPriority.NORMAL
    )
    db.add(movement_request)
    db.flush()

    total_items = 0

    for item in request.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        current_stock = StockService.calculate_current_stock(db, item.product_id, request.source_warehouse_id, item.source_location_id)
        if current_stock < item.quantity:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for product {product.name}. Available: {current_stock}, Requested: {item.quantity}"
            )

        batch_id = None
        if item.batch_number and product.has_batch:
            batch = db.query(ProductBatch).filter(
                ProductBatch.product_id == product.id,
                ProductBatch.batch_number == item.batch_number
            ).first()
            if batch:
                batch_id = batch.id

        movement_item = MovementRequestItem(
            request_id=movement_request.id,
            product_id=item.product_id,
            batch_id=batch_id,
            quantity=item.quantity,
            source_location_id=item.source_location_id,
            destination_location_id=item.destination_location_id,
            status="PENDING"
        )
        db.add(movement_item)
        total_items += 1

    movement_request.status = MovementStatus.PENDING
    movement_request.approved_by = current_user.id
    movement_request.approval_notes = f"Transfer approved by {current_user.full_name}"

    db.commit()
    db.refresh(movement_request)

    try:
        result = await StockService.apply_movement(db, movement_request.id, current_user.id)
        return TransferResponse(
            success=True,
            movement_request_id=movement_request.id,
            request_number=movement_request.request_number,
            items_transferred=total_items,
            message=f"Transferencia de {total_items} producto(s) completada exitosamente"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error applying transfer: {str(e)}")


@router.get("/transfers", response_model=TransferHistoryResponse)
def get_transfer_history(
    product_id: Optional[int] = Query(None),
    source_warehouse_id: Optional[int] = Query(None),
    destination_warehouse_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3, 4], "inventory:view"))
):
    """
    Get transfer history.
    Requires roles 1-4 with inventory:view permission.
    """
    from app.models.ledger import LedgerEntry

    query = db.query(
        LedgerEntry,
        MovementRequest.request_number,
        MovementRequest.notes,
        Product.name.label("product_name"),
        Product.sku.label("product_sku"),
        SourceWh.name.label("source_warehouse_name"),
        DestWh.name.label("destination_warehouse_name"),
        SourceLoc.code.label("source_location_code"),
        DestLoc.code.label("destination_location_code"),
        User.full_name.label("transferred_by_name")
    ).join(
        MovementRequest, LedgerEntry.movement_request_id == MovementRequest.id
    ).join(
        Product, LedgerEntry.product_id == Product.id
    ).join(
        Warehouse.label("SourceWh"), MovementRequest.source_warehouse_id == Warehouse.id
    ).join(
        Warehouse.label("DestWh"), MovementRequest.destination_warehouse_id == Warehouse.id
    ).outerjoin(
        StorageLocation.label("SourceLoc"), LedgerEntry.location_id == StorageLocation.id
    ).join(
        User, LedgerEntry.applied_by == User.id
    ).filter(
        MovementRequest.type == MovementType.TRANSFER
    )

    if product_id:
        query = query.filter(LedgerEntry.product_id == product_id)
    if source_warehouse_id:
        query = query.filter(MovementRequest.source_warehouse_id == source_warehouse_id)
    if destination_warehouse_id:
        query = query.filter(MovementRequest.destination_warehouse_id == destination_warehouse_id)
    if start_date:
        query = query.filter(LedgerEntry.applied_at >= start_date)
    if end_date:
        query = query.filter(LedgerEntry.applied_at <= end_date)

    total = query.count()
    query = query.order_by(LedgerEntry.applied_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    results = query.all()

    transfers = []
    for row in results:
        ledger_entry = row[0]
        transfers.append(TransferHistoryItem(
            id=ledger_entry.id,
            request_number=row.request_number,
            product_id=ledger_entry.product_id,
            product_name=row.product_name,
            product_sku=row.product_sku,
            source_warehouse_id=MovementRequest.source_warehouse_id,
            source_warehouse_name=row.source_warehouse_name,
            destination_warehouse_id=MovementRequest.destination_warehouse_id,
            destination_warehouse_name=row.destination_warehouse_name,
            source_location_code=row.source_location_code,
            destination_location_code=row.destination_location_code,
            quantity=ledger_entry.quantity,
            notes=row.notes,
            transferred_by=ledger_entry.applied_by,
            transferred_by_name=row.transferred_by_name,
            created_at=ledger_entry.applied_at
        ))

    return TransferHistoryResponse(
        transfers=transfers,
        total=total,
        page=page,
        page_size=page_size
    )


# ============ CYCLE COUNT ENDPOINTS ============

class CycleCountSession:
    """In-memory storage for cycle count sessions (in production, use a database model)"""
    sessions: Dict[int, Dict[str, Any]] = {}
    items: Dict[int, Dict[int, Dict[str, Any]]] = {}  # session_id -> item_id -> data
    _last_id = 0
    
    @classmethod
    def create_session(cls, warehouse_id: int, user_id: int, location_ids: List[int], 
                      product_ids: List[int], priority: str, notes: str, warehouse_name: str, 
                      user_name: str, items_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        cls._last_id += 1
        session_id = cls._last_id
        
        session = {
            "id": session_id,
            "request_number": f"CC-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "warehouse_id": warehouse_id,
            "warehouse_name": warehouse_name,
            "status": "PENDING",
            "priority": priority,
            "notes": notes,
            "created_by": user_id,
            "created_by_name": user_name,
            "created_at": datetime.now(),
            "completed_at": None,
            "items_data": items_data
        }
        cls.sessions[session_id] = session
        cls.items[session_id] = {}
        
        for item in items_data:
            item_id = len(cls.items[session_id]) + 1
            cls.items[session_id][item_id] = {
                "id": item_id,
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "product_sku": item["product_sku"],
                "location_id": item["location_id"],
                "location_code": item["location_code"],
                "system_stock": item["system_stock"],
                "counted_stock": None,
                "variance": None,
                "notes": None,
                "counted_by": None,
                "counted_by_name": None,
                "counted_at": None,
            }
        
        return session
    
    @classmethod
    def get_session(cls, session_id: int) -> Optional[Dict[str, Any]]:
        return cls.sessions.get(session_id)
    
    @classmethod
    def get_all_sessions(cls) -> List[Dict[str, Any]]:
        return list(cls.sessions.values())
    
    @classmethod
    def update_item(cls, session_id: int, item_id: int, counted_stock: int, user_id: int, 
                    user_name: str, notes: Optional[str] = None) -> Dict[str, Any]:
        item = cls.items[session_id].get(item_id)
        if item:
            item["counted_stock"] = counted_stock
            item["variance"] = counted_stock - item["system_stock"]
            item["counted_by"] = user_id
            item["counted_by_name"] = user_name
            item["counted_at"] = datetime.now()
            if notes:
                item["notes"] = notes
            
            # Update session status to IN_PROGRESS if pending
            if cls.sessions[session_id]["status"] == "PENDING":
                cls.sessions[session_id]["status"] = "IN_PROGRESS"
        
        return item
    
    @classmethod
    def complete_session(cls, session_id: int) -> Dict[str, Any]:
        session = cls.sessions[session_id]
        session["status"] = "COMPLETED"
        session["completed_at"] = datetime.now()
        return session
    
    @classmethod
    def get_session_stats(cls, session_id: int) -> Dict[str, int]:
        items = cls.items.get(session_id, {})
        total = len(items)
        counted = sum(1 for item in items.values() if item["counted_stock"] is not None)
        with_variance = sum(1 for item in items.values() 
                           if item["counted_stock"] is not None and item["variance"] != 0)
        return {"total_items": total, "items_counted": counted, "items_with_variance": with_variance}


@router.post("/cycle-count", response_model=CycleCountResponse)
async def create_cycle_count(
    request: CycleCountCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_required_roles(3))
):
    """
    Create a new cycle count session.
    Requires roles 1-3 (Admin level).
    """
    warehouse = db.query(Warehouse).filter(Warehouse.id == request.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    items_data = []
    
    # Get products at specified locations or all products in warehouse
    query = db.query(ProductLocationAssignment, Product, StorageLocation).join(
        Product, ProductLocationAssignment.product_id == Product.id
    ).join(
        StorageLocation, ProductLocationAssignment.location_id == StorageLocation.id
    ).filter(
        ProductLocationAssignment.warehouse_id == request.warehouse_id
    )
    
    if request.location_ids:
        query = query.filter(ProductLocationAssignment.location_id.in_(request.location_ids))
    
    if request.product_ids:
        query = query.filter(ProductLocationAssignment.product_id.in_(request.product_ids))
    
    assignments = query.all()
    
    for assignment, product, location in assignments:
        system_stock = StockService.calculate_current_stock(
            db, product.id, request.warehouse_id, location.id
        )
        items_data.append({
            "product_id": product.id,
            "product_name": product.name,
            "product_sku": product.sku or "N/A",
            "location_id": location.id,
            "location_code": location.code,
            "system_stock": system_stock
        })
    
    if not items_data:
        raise HTTPException(status_code=400, detail="No products found for cycle count")

    session = CycleCountSession.create_session(
        warehouse_id=request.warehouse_id,
        user_id=current_user.id,
        location_ids=request.location_ids or [],
        product_ids=request.product_ids or [],
        priority=request.priority.value,
        notes=request.notes or "",
        warehouse_name=warehouse.name,
        user_name=current_user.full_name,
        items_data=items_data
    )
    
    stats = CycleCountSession.get_session_stats(session["id"])
    
    return CycleCountResponse(
        id=session["id"],
        request_number=session["request_number"],
        warehouse_id=session["warehouse_id"],
        warehouse_name=session["warehouse_name"],
        status=CycleCountStatus(session["status"]),
        priority=CycleCountPriority(session["priority"]),
        total_items=stats["total_items"],
        items_counted=stats["items_counted"],
        items_with_variance=stats["items_with_variance"],
        notes=session["notes"],
        created_by=session["created_by"],
        created_by_name=session["created_by_name"],
        created_at=session["created_at"],
        completed_at=session["completed_at"]
    )


@router.get("/cycle-count", response_model=CycleCountListResponse)
def list_cycle_counts(
    warehouse_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    List all cycle count sessions.
    """
    sessions = CycleCountSession.get_all_sessions()
    
    if warehouse_id:
        sessions = [s for s in sessions if s["warehouse_id"] == warehouse_id]
    if status:
        sessions = [s for s in sessions if s["status"] == status]
    
    total = len(sessions)
    start = (page - 1) * page_size
    end = start + page_size
    sessions = sorted(sessions, key=lambda x: x["created_at"], reverse=True)[start:end]
    
    result = []
    for session in sessions:
        stats = CycleCountSession.get_session_stats(session["id"])
        result.append(CycleCountResponse(
            id=session["id"],
            request_number=session["request_number"],
            warehouse_id=session["warehouse_id"],
            warehouse_name=session["warehouse_name"],
            status=CycleCountStatus(session["status"]),
            priority=CycleCountPriority(session["priority"]),
            total_items=stats["total_items"],
            items_counted=stats["items_counted"],
            items_with_variance=stats["items_with_variance"],
            notes=session["notes"],
            created_by=session["created_by"],
            created_by_name=session["created_by_name"],
            created_at=session["created_at"],
            completed_at=session["completed_at"]
        ))
    
    return CycleCountListResponse(
        counts=result,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/cycle-count/{count_id}", response_model=CycleCountDetailResponse)
def get_cycle_count_detail(
    count_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get detailed information about a cycle count session.
    """
    session = CycleCountSession.get_session(count_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cycle count not found")
    
    stats = CycleCountSession.get_session_stats(count_id)
    items = CycleCountSession.items.get(count_id, {})
    
    items_response = []
    for item in items.values():
        variance_pct = None
        if item["counted_stock"] is not None and item["system_stock"] > 0:
            variance_pct = (item["variance"] / item["system_stock"]) * 100
        
        items_response.append(CycleCountItemResponse(
            id=item["id"],
            product_id=item["product_id"],
            product_name=item["product_name"],
            product_sku=item["product_sku"],
            location_id=item["location_id"],
            location_code=item["location_code"],
            system_stock=item["system_stock"],
            counted_stock=item["counted_stock"],
            variance=item["variance"],
            variance_percentage=variance_pct,
            notes=item["notes"],
            counted_by=item["counted_by"],
            counted_by_name=item["counted_by_name"],
            counted_at=item["counted_at"]
        ))
    
    return CycleCountDetailResponse(
        id=session["id"],
        request_number=session["request_number"],
        warehouse_id=session["warehouse_id"],
        warehouse_name=session["warehouse_name"],
        status=CycleCountStatus(session["status"]),
        priority=CycleCountPriority(session["priority"]),
        total_items=stats["total_items"],
        items_counted=stats["items_counted"],
        items_with_variance=stats["items_with_variance"],
        notes=session["notes"],
        created_by=session["created_by"],
        created_by_name=session["created_by_name"],
        created_at=session["created_at"],
        completed_at=session["completed_at"],
        items=items_response
    )


class RecordCountRequest(BaseModel):
    item_id: int
    counted_stock: int
    notes: Optional[str] = None


@router.post("/cycle-count/{count_id}/record")
async def record_count(
    count_id: int,
    request: RecordCountRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_required_roles(4))
):
    """
    Record the counted stock for an item in a cycle count session.
    Requires roles 1-4 (Manager level).
    """
    session = CycleCountSession.get_session(count_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cycle count not found")
    
    if session["status"] == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cycle count already completed")
    
    item = CycleCountSession.update_item(
        session_id=count_id,
        item_id=request.item_id,
        counted_stock=request.counted_stock,
        user_id=current_user.id,
        user_name=current_user.full_name,
        notes=request.notes
    )
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    stats = CycleCountSession.get_session_stats(count_id)
    
    return {
        "success": True,
        "message": "Count recorded successfully",
        "item": item,
        "session_stats": stats
    }


@router.post("/cycle-count/{count_id}/complete")
async def complete_cycle_count(
    count_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_required_roles(3))
):
    """
    Complete a cycle count session.
    Creates adjustment movements for items with variance if auto_approve is True.
    Requires roles 1-3 (Admin level).
    """
    session = CycleCountSession.get_session(count_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cycle count not found")
    
    if session["status"] == "COMPLETED":
        raise HTTPException(status_code=400, detail="Cycle count already completed")
    
    # Check if all items are counted
    stats = CycleCountSession.get_session_stats(count_id)
    if stats["items_counted"] < stats["total_items"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Not all items have been counted. {stats['items_counted']}/{stats['total_items']} counted."
        )
    
    CycleCountSession.complete_session(count_id)
    stats = CycleCountSession.get_session_stats(count_id)
    
    return {
        "success": True,
        "message": "Cycle count completed",
        "stats": stats
    }


@router.post("/cycle-count/{count_id}/approve-variances")
async def approve_variances(
    count_id: int,
    request: VarianceApprovalRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_required_roles(2))
):
    """
    Approve or reject variances from a cycle count.
    If approved and apply_adjustment is True, creates adjustment movements.
    Requires roles 1-2 (Super Admin/Admin).
    """
    session = CycleCountSession.get_session(count_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cycle count not found")
    
    if session["status"] != "COMPLETED":
        raise HTTPException(status_code=400, detail="Cycle count must be completed first")
    
    results = {"approved": [], "rejected": [], "adjustments_created": 0}
    adjustments_request = {"items": []}
    
    for approval in request.approvals:
        item_id = approval.get("item_id")
        approve = approval.get("approve", True)
        apply_adjustment = approval.get("apply_adjustment", True)
        notes = approval.get("notes", "")
        
        item = CycleCountSession.items.get(count_id, {}).get(item_id)
        if not item:
            continue
        
        if not item["counted_stock"] or item["variance"] == 0:
            continue
        
        if approve:
            results["approved"].append(item_id)
            
            if apply_adjustment and item["variance"] != 0:
                adjustments_request["items"].append({
                    "product_id": item["product_id"],
                    "warehouse_id": session["warehouse_id"],
                    "location_id": item["location_id"],
                    "quantity": item["variance"],
                    "reason": "CYCLE_COUNT",
                    "notes": f"Cycle count {session['request_number']}: {notes or 'Variance adjustment'}"
                })
        else:
            results["rejected"].append(item_id)
    
    # Create adjustments if any
    if adjustments_request["items"]:
        try:
            for adj in adjustments_request["items"]:
                movement_request = MovementRequest(
                    request_number=f"CC-ADJ-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    type=MovementType.ADJUSTMENT,
                    status=MovementStatus.PENDING,
                    reason=adj["notes"],
                    requested_by=current_user.id,
                    priority=MovementPriority.NORMAL
                )
                db.add(movement_request)
                db.flush()
                
                movement_item = MovementRequestItem(
                    request_id=movement_request.id,
                    product_id=adj["product_id"],
                    quantity=abs(adj["quantity"]),
                    source_location_id=adj["location_id"] if adj["quantity"] < 0 else None,
                    destination_location_id=adj["location_id"] if adj["quantity"] >= 0 else None,
                    notes=f"Reason: {adj['reason']}",
                    status="PENDING"
                )
                db.add(movement_item)
            
            movement_request.status = MovementStatus.APPROVED
            movement_request.approved_by = current_user.id
            
            db.commit()
            
            # Apply the movement
            await StockService.apply_movement(db, movement_request.id, current_user.id)
            
            results["adjustments_created"] = len(adjustments_request["items"])
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error creating adjustments: {str(e)}")
    
    return {
        "success": True,
        "message": f"Processed {len(results['approved'])} approvals, {len(results['rejected'])} rejections",
        "results": results
    }


# ============ REPORT ENDPOINTS ============

@router.get("/reports/expiring", response_model=ExpiringProductsResponse)
def get_expiring_products(
    warehouse_id: Optional[int] = Query(None),
    days_ahead: int = Query(30, ge=1, le=365),
    include_expired: bool = Query(True),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "inventory:view"))
):
    """
    Get products with upcoming or expired expiration dates.
    Requires roles 1-3 with inventory:view permission.
    """
    from datetime import timedelta
    from app.models.ledger import LedgerEntry
    
    today = datetime.now().date()
    future_date = today + timedelta(days=days_ahead)
    
    query = db.query(
        ProductBatch,
        Product.name.label("product_name"),
        Product.sku.label("product_sku"),
        Warehouse.name.label("warehouse_name"),
        StorageLocation.code.label("location_code"),
        ProductLocationAssignment.quantity.label("quantity")
    ).join(
        Product, ProductBatch.product_id == Product.id
    ).join(
        ProductLocationAssignment, 
        (ProductLocationAssignment.product_id == ProductBatch.product_id) &
        (ProductLocationAssignment.batch_id == ProductBatch.id)
    ).join(
        Warehouse, ProductLocationAssignment.warehouse_id == Warehouse.id
    ).join(
        StorageLocation, ProductLocationAssignment.location_id == StorageLocation.id
    ).filter(
        ProductBatch.expiration_date.isnot(None),
        Product.has_expiration == True
    )
    
    if warehouse_id:
        query = query.filter(ProductLocationAssignment.warehouse_id == warehouse_id)
    
    if include_expired:
        query = query.filter(ProductBatch.expiration_date <= future_date)
    else:
        query = query.filter(ProductBatch.expiration_date <= future_date, ProductBatch.expiration_date > today)
    
    # Get total count before pagination
    total_query = db.query(func.count()).select_from(ProductBatch).join(
        Product, ProductBatch.product_id == Product.id
    ).join(
        ProductLocationAssignment,
        (ProductLocationAssignment.product_id == ProductBatch.product_id) &
        (ProductLocationAssignment.batch_id == ProductBatch.id)
    ).filter(
        ProductBatch.expiration_date.isnot(None),
        Product.has_expiration == True
    )
    
    if warehouse_id:
        total_query = total_query.filter(ProductLocationAssignment.warehouse_id == warehouse_id)
    
    if include_expired:
        total_query = total_query.filter(ProductBatch.expiration_date <= future_date)
    else:
        total_query = total_query.filter(ProductBatch.expiration_date <= future_date, ProductBatch.expiration_date > today)
    
    total = total_query.scalar() or 0
    
    # Apply pagination
    query = query.order_by(ProductBatch.expiration_date.asc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    results = query.all()
    
    products = []
    expired_count = 0
    expiring_soon_count = 0
    
    for row in results:
        batch = row[0]
        days_until = (batch.expiration_date - today).days
        is_expired = days_until < 0
        
        if is_expired:
            expired_count += 1
        elif days_until <= days_ahead:
            expiring_soon_count += 1
        
        products.append(ExpiringProductItem(
            product_id=batch.product_id,
            product_name=row.product_name,
            product_sku=row.product_sku,
            batch_number=batch.batch_number,
            warehouse_name=row.warehouse_name,
            location_code=row.location_code,
            quantity=row.quantity or 0,
            expiration_date=batch.expiration_date,
            days_until_expiry=days_until,
            is_expired=is_expired
        ))
    
    return ExpiringProductsResponse(
        products=products,
        total=total,
        expired_count=expired_count,
        expiring_soon_count=expiring_soon_count
    )


@router.get("/reports/low-stock", response_model=LowStockResponse)
def get_low_stock_products(
    warehouse_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "inventory:view"))
):
    """
    Get products that are at or below minimum stock levels.
    Requires roles 1-3 with inventory:view permission.
    """
    # Get all products with stock info
    products_query = db.query(Product).filter(
        Product.min_stock.isnot(None),
        Product.min_stock > 0
    )
    
    products_list = products_query.all()
    
    low_stock_products = []
    critical_count = 0
    warning_count = 0
    
    for product in products_list:
        current_stock = StockService.calculate_current_stock(db, product.id, warehouse_id)
        
        if current_stock <= (product.min_stock or 0):
            min_stock = product.min_stock or 0
            max_stock = product.max_stock
            stock_percentage = (current_stock / min_stock * 100) if min_stock > 0 else 0
            
            if stock_percentage <= 50:
                critical_count += 1
            else:
                warning_count += 1
            
            # Get primary warehouse name
            warehouse_name = None
            if warehouse_id:
                wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
                warehouse_name = wh.name if wh else None
            else:
                assignment = db.query(ProductLocationAssignment).filter(
                    ProductLocationAssignment.product_id == product.id
                ).first()
                if assignment:
                    wh = db.query(Warehouse).filter(Warehouse.id == assignment.warehouse_id).first()
                    warehouse_name = wh.name if wh else None
            
            low_stock_products.append(LowStockItem(
                product_id=product.id,
                product_name=product.name,
                product_sku=product.sku or "N/A",
                category=product.category.name if product.category else None,
                current_stock=current_stock,
                min_stock=min_stock,
                max_stock=max_stock,
                stock_percentage=round(stock_percentage, 2),
                warehouse_name=warehouse_name,
                last_updated=None
            ))
    
    # Sort by stock percentage (lowest first)
    low_stock_products.sort(key=lambda x: x.stock_percentage)
    
    total = len(low_stock_products)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_products = low_stock_products[start:end]
    
    return LowStockResponse(
        products=paginated_products,
        total=total,
        critical_count=critical_count,
        warning_count=warning_count
    )


@router.get("/reports/summary", response_model=InventorySummaryResponse)
def get_inventory_summary(
    warehouse_id: Optional[int] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "inventory:view"))
):
    """
    Get a comprehensive inventory summary.
    Includes totals, low stock count, expiring soon count, and breakdowns by category and warehouse.
    Requires roles 1-3 with inventory:view permission.
    """
    from datetime import timedelta
    
    # Get all products
    products_query = db.query(Product)
    if warehouse_id:
        products_query = products_query.join(
            ProductLocationAssignment, ProductLocationAssignment.product_id == Product.id
        ).filter(ProductLocationAssignment.warehouse_id == warehouse_id)
    
    all_products = products_query.all()
    total_products = len(all_products)
    
    # Calculate stock and alerts
    total_stock = 0
    low_stock_count = 0
    expiring_soon_count = 0
    out_of_stock_count = 0
    
    today = datetime.now().date()
    future_date = today + timedelta(days=30)
    
    for product in all_products:
        current_stock = StockService.calculate_current_stock(db, product.id, warehouse_id)
        total_stock += current_stock
        
        if current_stock == 0:
            out_of_stock_count += 1
        elif product.min_stock and current_stock <= product.min_stock:
            low_stock_count += 1
        
        # Check for expiring products
        if product.has_expiration:
            expiring_batches = db.query(ProductBatch).filter(
                ProductBatch.product_id == product.id,
                ProductBatch.expiration_date <= future_date,
                ProductBatch.expiration_date >= today
            ).count()
            if expiring_batches > 0:
                expiring_soon_count += 1
    
    # Summary by category
    categories_query = db.query(
        Product.category_id,
        Product.category.has(name).label("category_name"),
        func.count(Product.id).label("total_products"),
        func.sum(ProductLocationAssignment.quantity).label("total_stock")
    ).join(
        ProductLocationAssignment, ProductLocationAssignment.product_id == Product.id, isouter=True
    ).group_by(Product.category_id, Product.category)
    
    if warehouse_id:
        categories_query = categories_query.filter(ProductLocationAssignment.warehouse_id == warehouse_id)
    
    categories_result = categories_query.all()
    
    by_category = []
    for row in categories_result:
        by_category.append(InventorySummaryCategory(
            category_id=row[0],
            category_name=row[1] or "Sin Categoría",
            total_products=row[2] or 0,
            total_stock=row[3] or 0,
            total_value=None
        ))
    
    # Summary by warehouse
    warehouses_query = db.query(Warehouse).filter(Warehouse.is_active == True)
    if warehouse_id:
        warehouses_query = warehouses_query.filter(Warehouse.id == warehouse_id)
    
    warehouses = warehouses_query.all()
    
    by_warehouse = []
    for wh in warehouses:
        wh_products = db.query(func.count(func.distinct(ProductLocationAssignment.product_id))).filter(
            ProductLocationAssignment.warehouse_id == wh.id
        ).scalar() or 0
        
        wh_stock = db.query(func.sum(ProductLocationAssignment.quantity)).filter(
            ProductLocationAssignment.warehouse_id == wh.id
        ).scalar() or 0
        
        wh_low_stock = db.query(func.count(func.distinct(Product.id))).join(
            ProductLocationAssignment, ProductLocationAssignment.product_id == Product.id
        ).filter(
            ProductLocationAssignment.warehouse_id == wh.id,
            Product.min_stock.isnot(None),
            ProductLocationAssignment.quantity <= Product.min_stock
        ).scalar() or 0
        
        wh_expiring = db.query(func.count(func.distinct(ProductBatch.product_id))).join(
            ProductLocationAssignment,
            (ProductLocationAssignment.product_id == ProductBatch.product_id) &
            (ProductLocationAssignment.batch_id == ProductBatch.id)
        ).filter(
            ProductLocationAssignment.warehouse_id == wh.id,
            ProductBatch.expiration_date <= future_date,
            ProductBatch.expiration_date >= today
        ).scalar() or 0
        
        by_warehouse.append(InventorySummaryWarehouse(
            warehouse_id=wh.id,
            warehouse_name=wh.name,
            warehouse_code=wh.code,
            total_products=wh_products,
            total_stock=wh_stock,
            low_stock_count=wh_low_stock,
            expiring_soon_count=wh_expiring
        ))
    
    return InventorySummaryResponse(
        total_products=total_products,
        total_stock=total_stock,
        total_value=None,
        low_stock_count=low_stock_count,
        expiring_soon_count=expiring_soon_count,
        out_of_stock_count=out_of_stock_count,
        by_category=by_category,
        by_warehouse=by_warehouse
    )
