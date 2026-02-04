from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from app.models.epp import EPPStatus

class EPPBase(BaseModel):
    product_id: int
    serial_number: Optional[str] = None
    size: Optional[str] = None
    certification: Optional[str] = None
    useful_life_days: Optional[int] = None
    notes: Optional[str] = None

class EPPCreate(EPPBase):
    pass

class EPPUpdate(BaseModel):
    size: Optional[str] = None
    certification: Optional[str] = None
    useful_life_days: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[EPPStatus] = None
    expiration_date: Optional[date] = None
    assigned_to: Optional[int] = None

class EPPResponse(EPPBase):
    id: int
    status: EPPStatus
    assignment_date: Optional[date] = None
    expiration_date: Optional[date] = None
    assigned_to: Optional[int] = None
    
    # Nested product summary
    product: Optional['ProductSummary'] = None
    
    model_config = ConfigDict(from_attributes=True)

class ProductSummary(BaseModel):
    id: int
    name: str
    sku: str
    
    model_config = ConfigDict(from_attributes=True)

class InspectionBase(BaseModel):
    passed: bool
    notes: Optional[str] = None
    evidence_id: Optional[str] = None

class InspectionCreate(InspectionBase):
    pass

class InspectionResponse(InspectionBase):
    id: int
    epp_id: int
    inspection_date: datetime
    inspector_id: int

    model_config = ConfigDict(from_attributes=True)

class EPPWithInspections(EPPResponse):
    inspections: List[InspectionResponse] = []
