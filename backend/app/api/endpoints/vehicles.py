from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleMaintenance, VehicleDocument, VehicleStatus
from app.schemas.vehicle import (
    VehicleCreate, VehicleUpdate, VehicleResponse,
    VehicleMaintenanceCreate, VehicleMaintenanceResponse,
    VehicleDocumentCreate, VehicleDocumentResponse, VehicleDocumentValidate
)

router = APIRouter()

# --- Vehicle CRUD ---

@router.post("/", response_model=VehicleResponse)
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check for duplicate VIN or License Plate
    if db.query(Vehicle).filter(Vehicle.vin == vehicle.vin).first():
        raise HTTPException(status_code=400, detail="Vehicle with this VIN already exists")
    if db.query(Vehicle).filter(Vehicle.license_plate == vehicle.license_plate).first():
        raise HTTPException(status_code=400, detail="Vehicle with this License Plate already exists")

    db_vehicle = Vehicle(**vehicle.model_dump())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.get("/", response_model=List[VehicleResponse])
def get_vehicles(
    skip: int = 0,
    limit: int = 100,
    status: Optional[VehicleStatus] = None,
    assigned_to: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Vehicle).options(
        joinedload(Vehicle.maintenances),
        joinedload(Vehicle.documents)
    )
    
    if status:
        query = query.filter(Vehicle.status == status)
    if assigned_to:
        query = query.filter(Vehicle.assigned_to == assigned_to)
        
    return query.offset(skip).limit(limit).all()

@router.get("/{id}", response_model=VehicleResponse)
def get_vehicle(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(Vehicle).options(
        joinedload(Vehicle.maintenances),
        joinedload(Vehicle.documents)
    ).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@router.put("/{id}", response_model=VehicleResponse)
def update_vehicle(id: int, vehicle_update: VehicleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    update_data = vehicle_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)
        
    db.commit()
    db.refresh(vehicle)
    return vehicle

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    db.delete(vehicle)
    db.commit()
    return None

# --- Maintenance ---

@router.post("/{id}/maintenances", response_model=VehicleMaintenanceResponse)
def create_maintenance(id: int, maintenance: VehicleMaintenanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    db_maintenance = VehicleMaintenance(
        vehicle_id=id,
        **maintenance.model_dump()
    )
    db.add(db_maintenance)
    
    # Update vehicle status to MAINTENANCE if type is CORRECTIVE or just based on logic
    # The prompt doesn't specify status change logic, but usually maintenance implies unavailable.
    # However, I'll stick to manual status updates or specific rules if asked.
    # For now, just record it.
    
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance

# --- Documents ---

@router.post("/{id}/documents", response_model=VehicleDocumentResponse)
def create_document(id: int, document: VehicleDocumentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    db_document = VehicleDocument(
        vehicle_id=id,
        **document.model_dump()
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

@router.post("/documents/{doc_id}/validate", response_model=VehicleDocumentResponse)
def validate_document(doc_id: int, validation: VehicleDocumentValidate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Validate a document. Requires evidence.
    """
    document = db.query(VehicleDocument).filter(VehicleDocument.id == doc_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check evidence
    evidence = validation.evidence_id or document.evidence_id
    if validation.verified and not evidence:
        raise HTTPException(status_code=400, detail="Evidence is required to validate document")
        
    document.verified = validation.verified
    document.verified_by = current_user.id if validation.verified else None
    if validation.evidence_id:
        document.evidence_id = validation.evidence_id
        
    db.commit()
    db.refresh(document)
    return document
