from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.services.report_service import ReportService
from app.models.user import User

router = APIRouter()

@router.get("/items-on-loan")
def get_items_on_loan(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all items currently on loan or assigned.
    """
    if current_user.role_id not in [1, 2]: # Admin or Moderator
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReportService.get_items_on_loan(db)

@router.get("/user-responsibility/{user_id}")
def get_user_responsibility(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get items assigned to a specific user.
    """
    if current_user.role_id not in [1, 2] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReportService.get_user_responsibility(db, user_id)

@router.get("/utilization")
def get_utilization_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get utilization statistics.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReportService.get_utilization_stats(db)

@router.get("/inventory/summary")
def get_inventory_summary(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get inventory summary with total items, value and product count.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReportService.get_inventory_summary(db)

@router.get("/movements/daily")
def get_movements_daily(
    days: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get daily movement summary for the last N days.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReportService.get_movements_daily(db, days)

@router.get("/inventory/turnover")
def get_inventory_turnover(
    period_days: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get inventory turnover by category for the specified period.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReportService.get_inventory_turnover(db, period_days)

@router.get("/movements/summary")
def get_movements_summary(
    period: str = "month",
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get movements summary by type for the specified period.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReportService.get_movements_summary(db, period)

@router.get("/vehicles/compliance")
def get_vehicle_compliance(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get vehicle compliance report based on document expiration.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReportService.get_vehicle_compliance(db)

@router.get("/epp/expiration")
def get_epp_expiration(
    days: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get EPP items expiring within the specified number of days.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReportService.get_epp_expiration(db, days)
