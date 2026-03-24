from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.api.deps import get_db
from app.schemas.movement import (
    MovementRequestCreate, MovementRequest, MovementRequestUpdate, MovementRequestReview,
    MovementRequestWithDetails, MovementTrackingEvent, MovementTrackingEventCreate
)
from app.crud.movement import movement_request, movement
from app.models.user import User
from app.models.movement import MovementStatus, MovementType, MovementPriority
from app.services.stock_service import StockService

router = APIRouter()

def _is_admin(user: User) -> bool:
    return bool(user.role_id in (1, 2))

def _is_approver(user: User) -> bool:
    return bool(user.role_id in (1, 2, 3))

def _can_create_request(user: User) -> bool:
    return bool(user.role_id in (1, 2, 3, 4))


@router.post("/requests/", response_model=MovementRequestWithDetails)
def create_movement_request(
    *,
    db: Session = Depends(get_db),
    request_in: MovementRequestCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if not _can_create_request(current_user):
        raise HTTPException(status_code=403, detail="No autorizado para crear solicitudes")
         
    request = movement_request.create(db=db, obj_in=request_in, user_id=current_user.id)
    return request


@router.put("/requests/{id}", response_model=MovementRequestWithDetails)
def update_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    request_in: MovementRequestUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if request.requested_by != current_user.id and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="No tienes permisos suficientes")

    if request.status != MovementStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Solo solicitudes en estado BORRADOR pueden actualizarse")
    
    request = movement_request.update(db=db, db_obj=request, obj_in=request_in)
    return request


@router.post("/requests/{id}/submit", response_model=MovementRequestWithDetails)
def submit_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if request.requested_by != current_user.id and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="No tienes permisos suficientes")

    if request.status != MovementStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Solo solicitudes en estado BORRADOR pueden enviarse")
    
    try:
        request = movement_request.submit(db=db, db_obj=request, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return request


@router.get("/requests/", response_model=List[MovementRequest])
def read_movement_requests(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    type: Optional[str] = None,
    priority: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    requests = movement_request.get_multi(
        db=db, skip=skip, limit=limit,
        status=status, type=type, priority=priority, warehouse_id=warehouse_id
    )
    return requests


@router.get("/requests/my", response_model=List[MovementRequest])
def read_my_requests(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    type: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    requests = movement_request.get_multi_by_user(
        db=db, user_id=current_user.id, skip=skip, limit=limit,
        status=status, type=type, priority=priority
    )
    return requests


@router.get("/requests/pending", response_model=List[MovementRequest])
def read_pending_requests(
    *,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "requests:approve")),
) -> Any:
    requests = movement_request.get_multi_pending(
        db=db, skip=skip, limit=limit,
        type=type, warehouse_id=warehouse_id,
        start_date=start_date, end_date=end_date, priority=priority
    )
    return requests


@router.get("/requests/{id}", response_model=MovementRequestWithDetails)
def read_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if request.requested_by != current_user.id and not _is_approver(current_user):
        raise HTTPException(status_code=403, detail="No tienes permisos suficientes")
        
    return request


@router.delete("/requests/{id}", response_model=dict)
def delete_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
    if request.requested_by != current_user.id and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="No tienes permisos suficientes")

    if request.status != MovementStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Solo solicitudes en estado BORRADOR pueden eliminarse")
    
    db.delete(request)
    db.commit()
    return {"ok": True}


@router.post("/requests/{id}/approve", response_model=MovementRequestWithDetails)
def approve_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    review_in: Optional[MovementRequestReview] = None,
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "requests:approve")),
) -> Any:
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if request.requested_by == current_user.id and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="No puedes aprobar tus propias solicitudes")

    if request.status != MovementStatus.PENDING:
        raise HTTPException(status_code=400, detail="Solo solicitudes PENDIENTES pueden aprobarse")
        
    if request.type == MovementType.ADJUSTMENT.value and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Los ajustes requieren aprobación de Administrador")

    try:
        notes = review_in.notes if review_in else None
        request = movement_request.approve(db=db, db_obj=request, user_id=current_user.id, notes=notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return request


@router.post("/requests/{id}/reject", response_model=MovementRequestWithDetails)
def reject_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    review_in: Optional[MovementRequestReview] = None,
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "requests:approve")),
) -> Any:
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
    if request.status != MovementStatus.PENDING:
        raise HTTPException(status_code=400, detail="Solo solicitudes PENDIENTES pueden rechazarse")

    try:
        notes = review_in.notes if review_in else None
        request = movement_request.reject(db=db, db_obj=request, user_id=current_user.id, notes=notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return request


@router.post("/requests/{id}/cancel", response_model=MovementRequestWithDetails)
def cancel_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    review_in: Optional[MovementRequestReview] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
    if request.requested_by != current_user.id and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="No tienes permisos suficientes")

    try:
        notes = review_in.notes if review_in else None
        request = movement_request.cancel(db=db, db_obj=request, user_id=current_user.id, notes=notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return request


@router.post("/requests/{id}/apply", response_model=MovementRequestWithDetails)
async def apply_movement_request(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    from app.services.stock_service import StockService
    
    try:
        result = await StockService.apply_movement(db, id, current_user.id)
        
        request = movement_request.get(db=db, id=id)
        return request
        
    except HTTPException as e:
        raise e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/{id}/tracking", response_model=MovementTrackingEvent)
def add_tracking_event(
    *,
    db: Session = Depends(get_db),
    id: int,
    event_in: MovementTrackingEventCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    try:
        event = movement_request.add_tracking_event(
            db=db,
            request_id=id,
            event_type=event_in.event_type,
            performed_by=current_user.id,
            notes=event_in.event_description,
            location_name=event_in.location_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return event


@router.get("/requests/{id}/tracking", response_model=List[MovementTrackingEvent])
def get_tracking_events(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    request = movement_request.get(db=db, id=id)
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    events = movement_request.get_tracking_events(db=db, request_id=id)
    return events
