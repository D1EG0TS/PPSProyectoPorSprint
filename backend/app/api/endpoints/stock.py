from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.services.stock_service import StockService
from app.schemas.stock import StockResponse, StockValidationRequest, LedgerEntryResponse
from app.models.user import User

router = APIRouter()

@router.get("/current/{product_id}", response_model=StockResponse)
def get_current_stock(
    product_id: int,
    warehouse_id: Optional[int] = Query(None),
    location_id: Optional[int] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get current stock for a product, optionally filtered by warehouse or location.
    """
    qty = StockService.calculate_current_stock(db, product_id, warehouse_id, location_id)
    return StockResponse(
        product_id=product_id,
        quantity=qty,
        warehouse_id=warehouse_id,
        location_id=location_id
    )

@router.get("/warehouse/{warehouse_id}", response_model=List[StockResponse])
def get_warehouse_stock(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get stock for all products in a warehouse.
    Note: This might be heavy, consider pagination or just listing non-zero products.
    For now, we return a placeholder or need to implement listing all products with stock.
    StockService currently calculates per product.
    TODO: Implement bulk stock retrieval in StockService.
    """
    # For MVP/Sprint, we might skip this or implement a simple query
    # Query distinct products in ledger for this warehouse
    from app.models.ledger import LedgerEntry
    product_ids = db.query(LedgerEntry.product_id).filter(LedgerEntry.warehouse_id == warehouse_id).distinct().all()
    
    results = []
    for (pid,) in product_ids:
        qty = StockService.calculate_current_stock(db, pid, warehouse_id=warehouse_id)
        if qty != 0:
            results.append(StockResponse(product_id=pid, quantity=qty, warehouse_id=warehouse_id))
            
    return results

@router.get("/location/{location_id}", response_model=List[StockResponse])
def get_location_stock(
    location_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get stock for a specific location.
    """
    # Similar to warehouse, query distinct products in this location
    from app.models.ledger import LedgerEntry
    product_ids = db.query(LedgerEntry.product_id).filter(LedgerEntry.location_id == location_id).distinct().all()
    
    results = []
    for (pid,) in product_ids:
        qty = StockService.calculate_current_stock(db, pid, location_id=location_id)
        if qty != 0:
            results.append(StockResponse(product_id=pid, quantity=qty, location_id=location_id))
            
    return results

@router.post("/validate", response_model=dict)
def validate_stock(
    request: StockValidationRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Validate if enough stock exists.
    """
    try:
        StockService.validate_stock_availability(
            db, 
            request.product_id, 
            request.warehouse_id, 
            request.quantity, 
            request.location_id
        )
        return {"valid": True, "message": "Stock available"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/dashboard/metrics")
def get_stock_dashboard_metrics(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get high-level stock metrics for dashboard.
    """
    from app.models.product import Product
    from app.models.movement import Movement
    from datetime import datetime, timezone
    from sqlalchemy import func

    # 1. Total Products (Active)
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0
    
    # 2. Movements Today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    # SQLite might need careful datetime handling, but ORM usually handles comparison
    movements_today = db.query(func.count(Movement.id)).filter(Movement.created_at >= today_start).scalar() or 0
    
    # 3. Low Stock & Total Value
    # Iterate for MVP accuracy. Optimization: Cache this or use SQL view.
    products = db.query(Product).filter(Product.is_active == True).all()
    
    low_stock_count = 0
    total_value = 0.0
    
    for p in products:
        # Calculate stock
        stock = StockService.calculate_current_stock(db, p.id)
        
        # Low Stock
        if p.min_stock > 0 and stock <= p.min_stock:
            low_stock_count += 1
            
        # Value
        if stock > 0:
            total_value += float(p.cost or 0) * stock
            
    return {
        "totalProducts": total_products,
        "totalValue": total_value,
        "movementsToday": movements_today,
        "lowStockCount": low_stock_count
    }

@router.get("/history/{product_id}", response_model=List[LedgerEntryResponse])
def get_stock_history(
    product_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get full kardex/history for a product.
    """
    return StockService.get_stock_history(db, product_id)
