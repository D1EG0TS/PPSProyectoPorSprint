from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date
from app.models.vehicle import VehicleStatus, MaintenanceType, DocumentType

# --- Document Schemas ---

class VehicleDocumentBase(BaseModel):
    document_type: DocumentType
    expiration_date: Optional[date] = None
    evidence_id: Optional[str] = None

class VehicleDocumentCreate(VehicleDocumentBase):
    pass

class VehicleDocumentValidate(BaseModel):
    verified: bool
    evidence_id: Optional[str] = None # Mandatory logic-wise if not already present

class VehicleDocumentResponse(VehicleDocumentBase):
    id: int
    vehicle_id: int
    verified: bool
    verified_by: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Maintenance Schemas ---

class VehicleMaintenanceBase(BaseModel):
    maintenance_type: MaintenanceType
    date: date
    provider: Optional[str] = None
    cost: Optional[float] = None
    odometer: Optional[float] = None
    description: Optional[str] = None
    evidence_id: Optional[str] = None

class VehicleMaintenanceCreate(VehicleMaintenanceBase):
    pass

class VehicleMaintenanceResponse(VehicleMaintenanceBase):
    id: int
    vehicle_id: int
    
    model_config = ConfigDict(from_attributes=True)

# --- Vehicle Schemas ---

class VehicleBase(BaseModel):
    vin: str
    license_plate: str
    brand: str
    model: str
    year: int
    odometer: Optional[float] = 0.0
    status: Optional[VehicleStatus] = VehicleStatus.AVAILABLE
    assigned_to: Optional[int] = None
    insurance_policy: Optional[str] = None
    insurance_expiration: Optional[date] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    odometer: Optional[float] = None
    status: Optional[VehicleStatus] = None
    assigned_to: Optional[int] = None
    insurance_policy: Optional[str] = None
    insurance_expiration: Optional[date] = None

class VehicleResponse(VehicleBase):
    id: int
    maintenances: List[VehicleMaintenanceResponse] = []
    documents: List[VehicleDocumentResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
