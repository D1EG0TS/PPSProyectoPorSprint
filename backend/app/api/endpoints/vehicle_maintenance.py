from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.vehicle_maintenance import (
    VehicleMaintenanceType, 
    VehicleMaintenanceRecord, 
    VehicleMaintenanceAttachment,
    VehicleMaintenancePart,
    MaintenanceStatus
)
from app.schemas.vehicle_maintenance_schemas import (
    MaintenanceTypeCreate, MaintenanceTypeUpdate, MaintenanceTypeResponse,
    MaintenanceRecordCreate, MaintenanceRecordUpdate, MaintenanceRecordResponse, MaintenanceRecordListResponse,
    MaintenanceStatsResponse, UpcomingMaintenanceResponse, DashboardStats,
    MaintenancePartCreate, MaintenancePartResponse,
    MaintenanceAttachmentCreate, MaintenanceAttachmentResponse
)

from app.services.vehicle_maintenance_service import VehicleMaintenanceService

router = APIRouter()

# --- Permissions Helpers ---
def check_role(user: User, allowed_roles: List[int]):
    if user.role_id not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not enough permissions")

# --- Maintenance Types (Roles 1-2) ---

@router.get("/types", response_model=List[MaintenanceTypeResponse])
def get_maintenance_types(
    skip: int = 0, limit: int = 100, active_only: bool = True, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3, 4]) # 3/4 can view types to select them
    query = db.query(VehicleMaintenanceType)
    if active_only:
        query = query.filter(VehicleMaintenanceType.is_active == True)
    return query.offset(skip).limit(limit).all()

@router.post("/types", response_model=MaintenanceTypeResponse)
def create_maintenance_type(
    m_type: MaintenanceTypeCreate, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2])
    db_type = VehicleMaintenanceType(**m_type.model_dump())
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return db_type

@router.put("/types/{id}", response_model=MaintenanceTypeResponse)
def update_maintenance_type(
    id: int, m_type_update: MaintenanceTypeUpdate, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2])
    db_type = db.query(VehicleMaintenanceType).filter(VehicleMaintenanceType.id == id).first()
    if not db_type:
        raise HTTPException(status_code=404, detail="Maintenance Type not found")
    
    update_data = m_type_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_type, key, value)
    
    db.commit()
    db.refresh(db_type)
    return db_type

@router.delete("/types/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_type(
    id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2])
    db_type = db.query(VehicleMaintenanceType).filter(VehicleMaintenanceType.id == id).first()
    if not db_type:
        raise HTTPException(status_code=404, detail="Maintenance Type not found")
    
    # Soft delete
    db_type.is_active = False
    db.commit()
    return None

# --- Maintenance Records ---

@router.get("/records/{vehicle_id}", response_model=List[MaintenanceRecordListResponse])
def get_vehicle_maintenance_history(
    vehicle_id: int, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # Role 4 check: assigned only? For now allow if role 4
    check_role(current_user, [1, 2, 3, 4])
    records = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.vehicle_id == vehicle_id)\
        .order_by(VehicleMaintenanceRecord.service_date.desc()).all()
    
    # Transform to list response manually if needed or rely on Pydantic from_attributes
    # Pydantic should handle it if names match, but maintenance_type_name needs mapping
    # We can use a property or simple mapping loop
    response = []
    for r in records:
        response.append({
            "id": r.id,
            "vehicle_id": r.vehicle_id,
            "maintenance_type_name": r.maintenance_type.name if r.maintenance_type else "Unknown",
            "service_date": r.service_date,
            "status": r.status,
            "priority": r.priority,
            "cost_amount": r.cost_amount
        })
    return response

@router.post("/records", response_model=MaintenanceRecordResponse)
def create_maintenance_record(
    record: MaintenanceRecordCreate, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3, 4]) # 4 can create requests (status SCHEDULED)
    
    # If Role 4, force status to SCHEDULED/REQUESTED?
    # Logic handled in Service or here.
    if current_user.role_id == 4:
        record.status = MaintenanceStatus.SCHEDULED
        
    try:
        new_record = VehicleMaintenanceService.create_maintenance_record(db, record, current_user.id)
        return new_record
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/record/{record_id}", response_model=MaintenanceRecordResponse)
def get_maintenance_record_detail(
    record_id: int, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3, 4])
    record = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@router.put("/record/{record_id}", response_model=MaintenanceRecordResponse)
def update_maintenance_record(
    record_id: int, record_update: MaintenanceRecordUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3]) # Role 4 usually can't update after creation? Allow for now if needed.
    record = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)
        
    db.commit()
    db.refresh(record)
    return record

@router.post("/record/{record_id}/parts", response_model=MaintenancePartResponse)
def add_maintenance_part(
    record_id: int, part: MaintenancePartCreate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3])
    
    # Verify record exists
    record = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
        
    db_part = VehicleMaintenancePart(
        maintenance_id=record_id,
        **part.model_dump()
    )
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part

@router.post("/record/{record_id}/complete", response_model=MaintenanceRecordResponse)
async def complete_maintenance(
    record_id: int, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3])
    
    try:
        record = await VehicleMaintenanceService.complete_maintenance(db, record_id, current_user.id)
        return record
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/record/{record_id}/approve", response_model=MaintenanceRecordResponse)
def approve_maintenance(
    record_id: int, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3])
    record = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
        
    # Cost check for Role 3?
    if current_user.role_id == 3 and record.cost_amount and record.cost_amount > 5000:
        raise HTTPException(status_code=403, detail="Cost exceeds approval limit for your role")
        
    record.approved_by = current_user.id
    db.commit()
    db.refresh(record)
    return record

# --- Reports ---

@router.get("/upcoming", response_model=List[UpcomingMaintenanceResponse])
def get_upcoming_maintenance(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3, 4])
    return VehicleMaintenanceService.check_upcoming_maintenance(db)

@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3])
    return VehicleMaintenanceService.get_dashboard_stats(db)

@router.get("/stats/{vehicle_id}", response_model=MaintenanceStatsResponse)
def get_maintenance_stats(
    vehicle_id: int, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, [1, 2, 3, 4])
    total_cost = db.query(func.sum(VehicleMaintenanceRecord.cost_amount)).filter(VehicleMaintenanceRecord.vehicle_id == vehicle_id).scalar() or 0
    total_records = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.vehicle_id == vehicle_id).count()
    
    # Status breakdown
    breakdown = {}
    for status_enum in MaintenanceStatus:
        count = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.vehicle_id == vehicle_id, VehicleMaintenanceRecord.status == status_enum).count()
        breakdown[status_enum.value] = count
        
    return MaintenanceStatsResponse(
        vehicle_id=vehicle_id,
        total_cost=total_cost,
        total_records=total_records,
        status_breakdown=breakdown
    )
