from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, case, inspect
from app.models.product import Product
from app.models.ledger import LedgerEntry, LedgerEntryType
from app.models.warehouse import Warehouse
from app.models.product_location_models import ProductLocationAssignment
from app.models.location_models import StorageLocation
from app.schemas import catalog_schemas
from app.models.user import User

class CatalogService:
    def __init__(self, db: Session):
        self.db = db

    def get_catalog_for_role(
        self, 
        role_id: int, 
        skip: int = 0, 
        limit: int = 100, 
        search: Optional[str] = None
    ) -> List[Any]:
        
        # Base query for products
        query = self.db.query(Product).filter(Product.is_active == True)
        
        # Apply search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Product.name.like(search_pattern)) | 
                (Product.sku.like(search_pattern)) | 
                (Product.barcode.like(search_pattern))
            )

        # Pagination
        products = query.offset(skip).limit(limit).all()
        product_ids = [p.id for p in products]
        
        if not products:
            return []

        # Role-based logic
        if role_id == 5: # Guest
            return [catalog_schemas.PublicCatalogItem.model_validate(p) for p in products]

        elif role_id == 4: # Operational
            # Fetch total stock
            stock_map = self._get_total_stock_map(product_ids)
            # Fetch locations
            locations_map = self._get_locations_map(product_ids)
            
            results = []
            for p in products:
                item_data = catalog_schemas.PublicCatalogItem.model_validate(p).model_dump()
                total_stock = stock_map.get(p.id, 0)
                locs = locations_map.get(p.id, [])
                results.append(catalog_schemas.OperationalCatalogItem(
                    **item_data,
                    total_stock=total_stock,
                    available_stock=total_stock, # Simplified logic: available = total for now
                    can_add_to_request=True,
                    locations=locs
                ))
            return results

        elif role_id == 3: # Internal/Moderator
            # Fetch total stock
            stock_map = self._get_total_stock_map(product_ids)
            # Fetch stock by warehouse
            warehouse_stock_map = self._get_warehouse_stock_map(product_ids)
            # Fetch locations
            locations_map = self._get_locations_map(product_ids)
            
            results = []
            for p in products:
                item_data = catalog_schemas.PublicCatalogItem.model_validate(p).model_dump()
                total_stock = stock_map.get(p.id, 0)
                
                wh_stocks = warehouse_stock_map.get(p.id, [])
                locs = locations_map.get(p.id, [])
                
                results.append(catalog_schemas.InternalCatalogItem(
                    **item_data,
                    total_stock=total_stock,
                    available_stock=total_stock,
                    can_add_to_request=True,
                    stock_by_warehouse=wh_stocks,
                    locations=locs,
                    min_stock=p.min_stock,
                    needs_reorder=(total_stock < p.min_stock)
                ))
            return results

        elif role_id in [1, 2]: # Admin/SuperAdmin
            # Fetch total stock
            stock_map = self._get_total_stock_map(product_ids)
            # Fetch stock by warehouse
            warehouse_stock_map = self._get_warehouse_stock_map(product_ids)
            # Fetch locations
            locations_map = self._get_locations_map(product_ids)
            
            results = []
            for p in products:
                item_data = catalog_schemas.PublicCatalogItem.model_validate(p).model_dump()
                total_stock = stock_map.get(p.id, 0)
                
                wh_stocks = warehouse_stock_map.get(p.id, [])
                locs = locations_map.get(p.id, [])
                
                # Check for last movement
                last_movement = self.db.query(func.max(LedgerEntry.applied_at)).filter(LedgerEntry.product_id == p.id).scalar()
                
                results.append(catalog_schemas.AdminCatalogItem(
                    **item_data,
                    total_stock=total_stock,
                    available_stock=total_stock,
                    can_add_to_request=True,
                    stock_by_warehouse=wh_stocks,
                    min_stock=p.min_stock,
                    needs_reorder=(total_stock < p.min_stock),
                    locations=locs,
                    cost=p.cost,
                    price=p.price,
                    last_movement_date=last_movement
                ))
            return results
        
        else:
            # Fallback to Public
            return [catalog_schemas.PublicCatalogItem.model_validate(p) for p in products]

    def _get_total_stock_map(self, product_ids: List[int]) -> Dict[int, int]:
        # Using SUM of LedgerEntry records
        results = self.db.query(
            LedgerEntry.product_id, 
            func.sum(case(
                (LedgerEntry.entry_type == LedgerEntryType.INCREMENT, LedgerEntry.quantity),
                else_=-LedgerEntry.quantity
            ))
        ).filter(
            LedgerEntry.product_id.in_(product_ids)
        ).group_by(LedgerEntry.product_id).all()
        
        return {r[0]: (int(r[1]) if r[1] else 0) for r in results}

    def _get_warehouse_stock_map(self, product_ids: List[int]) -> Dict[int, List[catalog_schemas.StockByWarehouse]]:
        results = self.db.query(
            LedgerEntry.product_id,
            LedgerEntry.warehouse_id,
            Warehouse.name,
            func.sum(case(
                (LedgerEntry.entry_type == LedgerEntryType.INCREMENT, LedgerEntry.quantity),
                else_=-LedgerEntry.quantity
            ))
        ).join(
            Warehouse, LedgerEntry.warehouse_id == Warehouse.id
        ).filter(
            LedgerEntry.product_id.in_(product_ids)
        ).group_by(
            LedgerEntry.product_id, LedgerEntry.warehouse_id, Warehouse.name
        ).all()
        
        data = {}
        for r in results:
            pid = r[0]
            if pid not in data:
                data[pid] = []
            
            qty = int(r[3]) if r[3] else 0
            # Only include if quantity is relevant (e.g. non-zero)? 
            # Original logic included everything found in movements. 
            # We keep it consistent but usually we care about non-zero.
            if qty != 0:
                data[pid].append(catalog_schemas.StockByWarehouse(
                    warehouse_id=r[1],
                    warehouse_name=r[2],
                    quantity=qty
                ))
        return data

    def _get_locations_map(self, product_ids: List[int]) -> Dict[int, List[catalog_schemas.CatalogLocation]]:
        # Using ProductLocationAssignments for exact locations
        results = self.db.query(
            ProductLocationAssignment
        ).join(
            StorageLocation, ProductLocationAssignment.location_id == StorageLocation.id
        ).join(
            Warehouse, ProductLocationAssignment.warehouse_id == Warehouse.id
        ).filter(
            ProductLocationAssignment.product_id.in_(product_ids),
            ProductLocationAssignment.quantity > 0
        ).all()
        
        data = {}
        for pla in results:
            pid = pla.product_id
            if pid not in data:
                data[pid] = []
            
            # Helper to safely access relationships
            loc = pla.location
            wh = pla.warehouse
            
            data[pid].append(catalog_schemas.CatalogLocation(
                warehouse_name=wh.name if wh else "Unknown",
                location_code=loc.code if loc else "Unknown",
                aisle=loc.aisle if loc else None,
                rack=loc.rack if loc else None,
                shelf=loc.shelf if loc else None,
                position=loc.position if loc else None,
                quantity=pla.quantity,
                batch_number=str(pla.batch_id) if pla.batch_id else None # Simplified
            ))
        return data
