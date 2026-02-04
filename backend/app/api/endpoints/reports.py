from typing import Any, List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract, desc, and_

from app.api import deps
from app.models.movement import Movement, MovementType
from app.models.product import Product
from app.models.inventory_refs import Category
from app.models.vehicle import Vehicle, VehicleDocument, VehicleStatus
from app.models.epp import EPP, EPPStatus
from datetime import datetime, timedelta, timezone

router = APIRouter()

@router.get("/inventory/summary")
def get_inventory_summary(
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """
    Get inventory summary (total items, estimated value).
    """
    # Subquery to calculate current stock per product
    stock_subquery = db.query(
        Movement.product_id,
        func.sum(Movement.quantity).label("stock")
    ).group_by(Movement.product_id).subquery()

    # Calculate total value and total items
    # We join with Product to get the cost
    # We filter out negative stocks (should not happen in healthy system, but good for safety)
    summary = db.query(
        func.sum(stock_subquery.c.stock).label("total_items"),
        func.sum(stock_subquery.c.stock * Product.cost).label("total_value"),
        func.count(stock_subquery.c.product_id).label("total_products")
    ).join(
        Product, stock_subquery.c.product_id == Product.id
    ).filter(
        stock_subquery.c.stock > 0
    ).first()

    return {
        "total_items": summary.total_items or 0,
        "total_value": float(summary.total_value or 0),
        "total_products": summary.total_products or 0
    }

@router.get("/inventory/turnover")
def get_inventory_turnover(
    period_days: int = Query(30, description="Period in days to analyze"),
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> List[Dict[str, Any]]:
    """
    Get inventory turnover by product/category (OUT movements).
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=period_days)
    
    # Aggregation of OUT movements by Category
    # We can also do by Product, but for a high level report Category might be better.
    # The prompt says "rotación por producto/categoría". Let's return per Category for summary.
    
    results = db.query(
        Category.name.label("category_name"),
        func.abs(func.sum(Movement.quantity)).label("total_out"),
        func.count(Movement.id).label("movement_count")
    ).join(
        Product, Movement.product_id == Product.id
    ).join(
        Category, Product.category_id == Category.id
    ).filter(
        Movement.type == MovementType.OUT,
        Movement.created_at >= start_date
    ).group_by(
        Category.id, Category.name
    ).order_by(desc("total_out")).all()

    return [
        {
            "category": r.category_name,
            "total_out": r.total_out or 0,
            "movement_count": r.movement_count
        }
        for r in results
    ]

@router.get("/movements/summary")
def get_movements_summary(
    period: str = Query("month", pattern="^(week|month|year)$"),
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> List[Dict[str, Any]]:
    """
    Get movements summary by type and period.
    """
    # Group by Type and truncated date
    # SQLite has limited date functions, PostgreSQL uses date_trunc.
    # We need to be careful with database compatibility if not specified.
    # Assuming SQLite for local dev based on previous memories (StaticPool), 
    # but production might be different.
    # Using python-side processing for complex date grouping might be safer if DB is uncertain,
    # but "Optimizaciones con queries agregadas" implies DB side.
    # Let's try to filter by range first to limit data size.
    
    now = datetime.now(timezone.utc)
    if period == "week":
        start_date = now - timedelta(weeks=1)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=365)
        
    results = db.query(
        Movement.type,
        func.count(Movement.id).label("count"),
        func.sum(func.abs(Movement.quantity)).label("total_quantity")
    ).filter(
        Movement.created_at >= start_date
    ).group_by(
        Movement.type
    ).all()
    
    return [
        {
            "type": r.type,
            "count": r.count,
            "total_quantity": r.total_quantity or 0
        }
        for r in results
    ]

@router.get("/movements/daily")
def get_movements_daily(
    days: int = Query(30, description="Last N days"),
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> List[Dict[str, Any]]:
    """
    Get daily movement counts/quantities for charts.
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Extract date part. 
    # SQLite: strftime('%Y-%m-%d', created_at)
    # Postgres: date_trunc('day', created_at)
    # We will assume SQLite for now as per previous context.
    
    results = db.query(
        func.date(Movement.created_at).label("date"),
        Movement.type,
        func.sum(func.abs(Movement.quantity)).label("total_quantity")
    ).filter(
        Movement.created_at >= start_date
    ).group_by(
        func.date(Movement.created_at),
        Movement.type
    ).order_by("date").all()
    
    return [
        {
            "date": r.date,
            "type": r.type,
            "total_quantity": r.total_quantity or 0
        }
        for r in results
    ]

@router.get("/vehicles/compliance")
def get_vehicle_compliance(
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """
    Get vehicle document compliance report.
    """
    total_vehicles = db.query(func.count(Vehicle.id)).scalar()
    
    # Vehicles with at least one expired document
    now = datetime.now(timezone.utc).date()
    
    # This query finds vehicles that have ANY document that is expired
    expired_docs_vehicles = db.query(func.count(func.distinct(VehicleDocument.vehicle_id))).filter(
        VehicleDocument.expiration_date < now
    ).scalar() or 0
    
    # Vehicles with unverified documents (that require verification)
    pending_verification_vehicles = db.query(func.count(func.distinct(VehicleDocument.vehicle_id))).filter(
        VehicleDocument.verified == False,
        VehicleDocument.evidence_id != None # Assuming evidence implies it needs verification
    ).scalar() or 0
    
    return {
        "total_vehicles": total_vehicles,
        "vehicles_with_expired_docs": expired_docs_vehicles,
        "vehicles_pending_verification": pending_verification_vehicles,
        "compliance_rate": round(((total_vehicles - expired_docs_vehicles) / total_vehicles * 100) if total_vehicles else 100, 2)
    }

@router.get("/epp/expiration")
def get_epp_expiration(
    days: int = Query(30, description="Days threshold for expiration"),
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> List[Dict[str, Any]]:
    """
    Get EPPs expiring soon.
    """
    threshold_date = datetime.now(timezone.utc).date() + timedelta(days=days)
    now = datetime.now(timezone.utc).date()
    
    results = db.query(EPP).join(Product).filter(
        EPP.expiration_date <= threshold_date,
        EPP.status.in_([EPPStatus.ASSIGNED, EPPStatus.AVAILABLE])
    ).order_by(EPP.expiration_date).all()
    
    return [
        {
            "id": epp.id,
            "product_name": epp.product.name,
            "serial_number": epp.serial_number,
            "expiration_date": epp.expiration_date,
            "status": epp.status,
            "days_until_expiration": (epp.expiration_date - now).days if epp.expiration_date else None
        }
        for epp in results
    ]
