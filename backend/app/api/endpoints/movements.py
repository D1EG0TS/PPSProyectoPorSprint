from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.api.deps import get_db
from app.schemas.movement import MovementRequestCreate, MovementRequest, MovementRequestUpdate, MovementRequestReview
from app.crud.movement import movement_request, movement
from app.models.user import User
from app.models.movement import MovementStatus, MovementType
from app.services.stock_service import StockService

router = APIRouter()

@router.post("/requests/", response_model=MovementRequest)
def create_movement_request(
    *,
    db: Session = Depends(get_db),
    request_in: MovementRequestCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new movement request (Draft).
    """
    request = movement_request.create(db=db, obj_in=request_in, user_id=current_user.id)
    return request

@router.put("/requests/{id}", response_model=MovementRequest)
def update_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    request_in: MovementRequestUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a movement request. Only allowed if status is DRAFT.
    """
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Permission check: Only creator can update (or admin, but requirement focuses on creator/rol 4)
    # Using Tier system: 1=Super, 2=Admin, >2=User/Guest. So Admins are level <= 2.
    # Updated to use Role Level system: 100=Super, 50=Admin, 30=Manager.
    # Admins (>=50) can update any request.
    if request.requested_by != current_user.id and (not current_user.role or current_user.role.level < 50):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if request.status != MovementStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only DRAFT requests can be updated")
    
    request = movement_request.update(db=db, db_obj=request, obj_in=request_in)
    return request

@router.post("/requests/{id}/submit", response_model=MovementRequest)
def submit_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Submit a movement request (Draft -> Pending). Validates stock.
    """
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.requested_by != current_user.id and (not current_user.role or current_user.role.level < 50):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if request.status != MovementStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only DRAFT requests can be submitted")
    
    try:
        request = movement_request.submit(db=db, db_obj=request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return request

@router.get("/requests/pending", response_model=List[MovementRequest])
def read_pending_requests(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    type: Optional[MovementType] = None,
    warehouse_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all pending requests (for approval).
    Restricted to approvers (Roles 1-3).
    Supports filtering by type, warehouse, and date range.
    """
    # Using Role Level system: 100=Super, 50=Admin, 30=Manager.
    # Requirement says "Roles 1-3", which corresponds to Level >= 30.
    if not current_user.role or current_user.role.level < 30:
         raise HTTPException(status_code=403, detail="Not authorized to view pending requests")
    
    requests = movement_request.get_multi_pending(
        db=db, skip=skip, limit=limit,
        type=type, warehouse_id=warehouse_id,
        start_date=start_date, end_date=end_date
    )
    return requests

@router.get("/requests/{id}", response_model=MovementRequest)
def read_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get movement request by ID.
    """
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Permission check: Owner or Manager+ (Level >= 30)
    is_manager = current_user.role and current_user.role.level >= 30
    if request.requested_by != current_user.id and not is_manager:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return request

@router.post("/requests/{id}/approve", response_model=MovementRequest)
def approve_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    review_in: Optional[MovementRequestReview] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Approve a PENDING movement request.
    Only for Roles 1-3 (SuperAdmin, Admin, Manager).
    """
    # Permission check
    # Using Role Level system: 100=Super, 50=Admin, 30=Manager.
    if not current_user.role or current_user.role.level < 30:
         raise HTTPException(status_code=403, detail="Not authorized to approve requests")
    
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if request.status != MovementStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only PENDING requests can be approved")

    request.status = MovementStatus.APPROVED
    request.approved_by = current_user.id
    
    if review_in and review_in.notes:
        request.approval_notes = review_in.notes
        
    db.add(request)
    db.commit()
    db.refresh(request)
    return request

@router.post("/requests/{id}/apply", response_model=dict)
async def apply_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Apply an APPROVED movement request to the stock ledger.
    """
    try:
        result = await StockService.apply_movement(db, id, current_user.id)
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
