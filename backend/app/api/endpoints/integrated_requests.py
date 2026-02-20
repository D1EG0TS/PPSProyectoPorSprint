from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.schemas.integrated_request import (
    IntegratedRequestCreate, IntegratedRequestResponse, IntegratedRequestUpdate,
    RequestItemCreate, RequestToolCreate, RequestEPPCreate, RequestVehicleCreate,
    RequestItemStatusUpdate, RequestToolStatusUpdate, RequestEPPStatusUpdate, RequestVehicleStatusUpdate,
    RequestItemResponse, RequestToolResponse, RequestEPPResponse, RequestVehicleResponse
)
from app.services.integrated_request_service import IntegratedRequestService

router = APIRouter()

@router.post("/", response_model=IntegratedRequestResponse)
def create_integrated_request(
    request_in: IntegratedRequestCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create a new integrated request (Draft).
    """
    return IntegratedRequestService.create_request(db, request_in, current_user.id)

@router.get("/", response_model=List[IntegratedRequestResponse])
def get_integrated_requests(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    List integrated requests. 
    Role 4 (Operational) sees only their own.
    Roles 1-3 see all.
    """
    user_id = current_user.id if current_user.role_id == 4 else None
    return IntegratedRequestService.get_requests(db, skip, limit, user_id)

@router.get("/{id}", response_model=IntegratedRequestResponse)
def get_integrated_request(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get full detail of a request.
    """
    request = IntegratedRequestService.get_request(db, id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Permission check
    if current_user.role_id == 4 and request.requested_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
        
    return request

@router.put("/{id}", response_model=IntegratedRequestResponse)
def update_integrated_request(
    id: int,
    request_in: IntegratedRequestUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update request (only if Draft).
    """
    # Permission check: Only creator can update draft? Or admin too?
    # Assuming creator.
    request = IntegratedRequestService.get_request(db, id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if current_user.role_id == 4 and request.requested_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this request")

    return IntegratedRequestService.update_request(db, id, request_in)

@router.post("/{id}/submit", response_model=IntegratedRequestResponse)
def submit_integrated_request(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Submit request for approval.
    """
    return IntegratedRequestService.submit_request(db, id, current_user.id)

@router.post("/{id}/approve", response_model=IntegratedRequestResponse)
def approve_integrated_request(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Approve request (Roles 1-3).
    """
    if current_user.role_id not in [1, 2, 3]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return IntegratedRequestService.approve_request(db, id, current_user.id)

@router.post("/{id}/reject", response_model=IntegratedRequestResponse)
def reject_integrated_request(
    id: int,
    reason: str = Query(..., min_length=1),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Reject request (Roles 1-3).
    """
    if current_user.role_id > 3:
         raise HTTPException(status_code=403, detail="Not authorized to reject requests")
    return IntegratedRequestService.reject_request(db, id, current_user.id, reason)

# --- Item Management Endpoints ---

@router.post("/{id}/items", response_model=IntegratedRequestResponse)
def add_request_item(
    id: int,
    item_in: RequestItemCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    IntegratedRequestService.add_product_item(db, id, item_in)
    return IntegratedRequestService.get_request(db, id)

@router.post("/{id}/tools", response_model=IntegratedRequestResponse)
def add_request_tool(
    id: int,
    item_in: RequestToolCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    IntegratedRequestService.add_tool_item(db, id, item_in)
    return IntegratedRequestService.get_request(db, id)

@router.post("/{id}/epp", response_model=IntegratedRequestResponse)
def add_request_epp(
    id: int,
    item_in: RequestEPPCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    IntegratedRequestService.add_epp_item(db, id, item_in)
    return IntegratedRequestService.get_request(db, id)

@router.post("/{id}/vehicles", response_model=IntegratedRequestResponse)
def add_request_vehicle(
    id: int,
    item_in: RequestVehicleCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    IntegratedRequestService.add_vehicle_item(db, id, item_in)
    return IntegratedRequestService.get_request(db, id)

# --- Item Status Update Endpoints ---

@router.put("/{id}/items/{item_id}", response_model=RequestItemResponse)
async def update_request_item_status(
    id: int,
    item_id: int,
    status_in: RequestItemStatusUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update product item status (Deliver, Return).
    """
    if current_user.role_id > 3 and status_in.status not in ["EN_DEVOLUCION", "DEVUELTO_PARCIAL"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return await IntegratedRequestService.update_product_item_status(
        db, id, item_id, status_in.status, current_user.id, status_in.model_dump()
    )

@router.put("/{id}/tools/{item_id}", response_model=RequestToolResponse)
def update_request_tool_status(
    id: int,
    item_id: int,
    status_in: RequestToolStatusUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update tool item status (Assign, Return).
    """
    if current_user.role_id > 3 and status_in.status not in ["EN_DEVOLUCION"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return IntegratedRequestService.update_tool_item_status(
        db, id, item_id, status_in.status, current_user.id, status_in.model_dump()
    )

@router.put("/{id}/epp/{item_id}", response_model=RequestEPPResponse)
def update_request_epp_status(
    id: int,
    item_id: int,
    status_in: RequestEPPStatusUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update EPP item status (Assign, Return).
    """
    if current_user.role_id > 3 and status_in.status not in ["EN_DEVOLUCION"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return IntegratedRequestService.update_epp_item_status(
        db, id, item_id, status_in.status, current_user.id, status_in.model_dump()
    )

@router.put("/{id}/vehicles/{item_id}", response_model=RequestVehicleResponse)
def update_request_vehicle_status(
    id: int,
    item_id: int,
    status_in: RequestVehicleStatusUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update Vehicle item status (Assign, Return).
    """
    if current_user.role_id > 3 and status_in.status not in ["EN_DEVOLUCION"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return IntegratedRequestService.update_vehicle_item_status(
        db, id, item_id, status_in.status, current_user.id, status_in.model_dump()
    )
