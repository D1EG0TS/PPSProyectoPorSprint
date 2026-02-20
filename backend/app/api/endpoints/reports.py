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
