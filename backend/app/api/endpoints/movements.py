from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.api.deps import get_db
from app.schemas.movement import MovementRequestCreate, MovementRequest, MovementRequestUpdate, MovementRequestReview
from app.crud.movement import movement_request, movement
from app.models.user import User
from app.models.movement import MovementStatus, MovementType

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
    if request.requested_by != current_user.id and current_user.role.level < 50: # Assuming admin level is 50
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
    
    if request.requested_by != current_user.id and current_user.role.level < 50:
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
    if current_user.role.level < 20: # Assuming 20 is Manager
         raise HTTPException(status_code=403, detail="Not authorized to view pending requests")
    
    requests = movement_request.get_multi_pending(
        db=db, skip=skip, limit=limit,
        type=type, warehouse_id=warehouse_id,
        start_date=start_date, end_date=end_date
    )
    return requests

@router.post("/requests/{id}/approve", response_model=MovementRequest)
def approve_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    review_in: MovementRequestReview,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Approve a request.
    Restricted to approvers.
    """
    if current_user.role.level < 20:
         raise HTTPException(status_code=403, detail="Not authorized to approve")
    
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.status != MovementStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request must be PENDING to approve")
        
    request = movement_request.approve(db=db, db_obj=request, user_id=current_user.id, notes=review_in.notes)
    return request

@router.post("/requests/{id}/reject", response_model=MovementRequest)
def reject_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    review_in: MovementRequestReview,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Reject a request.
    Restricted to approvers.
    """
    if current_user.role.level < 20:
         raise HTTPException(status_code=403, detail="Not authorized to reject")
    
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.status != MovementStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request must be PENDING to reject")
        
    request = movement_request.reject(db=db, db_obj=request, user_id=current_user.id, notes=review_in.notes)
    return request

@router.post("/requests/{id}/apply", response_model=MovementRequest)
def apply_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Apply an approved request (generate ledger movements).
    Restricted to approvers (or specific role).
    """
    if current_user.role.level < 20:
         raise HTTPException(status_code=403, detail="Not authorized to apply")
    
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.status != MovementStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Request must be APPROVED to apply")
        
    try:
        request = movement_request.apply(db=db, db_obj=request, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return request

@router.get("/requests/my", response_model=List[MovementRequest])
def read_my_movement_requests(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[MovementStatus] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve movement requests created by the current user.
    """
    requests = movement_request.get_multi_by_user(
        db=db, user_id=current_user.id, skip=skip, limit=limit, status=status
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
    
    # Permission check
    if request.requested_by != current_user.id and current_user.role.level < 50:
         raise HTTPException(status_code=403, detail="Not enough permissions")
         
    return request

@router.get("/stock")
def get_stock(
    product_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current stock (filtered by product and/or warehouse).
    """
    stock = movement.get_stock_filtered(db, product_id=product_id, warehouse_id=warehouse_id)
    return {"stock": stock}
