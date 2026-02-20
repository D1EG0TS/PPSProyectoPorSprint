from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.schemas.tracking import ItemTrackingCreate, ItemTrackingResponse, PenalizationResponse, PenalizationCreate
from app.services.tracking_service import TrackingService
from app.models.user import User

router = APIRouter()

@router.post("/position", response_model=ItemTrackingResponse)
def log_position(
    tracking: ItemTrackingCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Log real-time position of an item.
    """
    return TrackingService.log_position(db, tracking, current_user.id)

@router.get("/penalizations/my", response_model=List[PenalizationResponse])
def get_my_penalizations(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get penalizations for the current user.
    """
    return TrackingService.get_penalizations_by_user(db, current_user.id)

@router.post("/penalizations", response_model=PenalizationResponse)
def create_penalization(
    penalization: PenalizationCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Manually create a penalization (Moderator/Admin only).
    """
    # Only moderator/admin should create manual penalizations
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return TrackingService.create_penalization(db, penalization, current_user.id)

@router.post("/run-daily-checks")
def run_daily_checks(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Trigger daily checks for expirations and overdue items.
    (Admin only)
    """
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    TrackingService.run_daily_checks(db)
    return {"message": "Daily checks completed successfully"}
