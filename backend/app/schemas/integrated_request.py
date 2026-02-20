from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from app.models.integrated_request import (
    IntegratedRequestPurpose,
    IntegratedRequestStatus,
    EmergencyLevel,
    RequestItemStatus,
    RequestToolStatus,
    RequestEPPStatus,
    FuelLevel,
    RequestVehicleStatus,
    RequestTrackingItemType,
    RequestTrackingAction
)

# --- Request Item (Consumables) ---
class RequestItemBase(BaseModel):
    product_id: int
    batch_id: Optional[int] = None
    quantity_requested: int
    purpose: Optional[str] = None
    notes: Optional[str] = None

class RequestItemCreate(RequestItemBase):
    pass

class RequestItemUpdate(BaseModel):
    quantity_requested: Optional[int] = None
    quantity_approved: Optional[int] = None
    quantity_delivered: Optional[int] = None
    quantity_returned: Optional[int] = None
    status: Optional[RequestItemStatus] = None
    notes: Optional[str] = None

class RequestItemStatusUpdate(BaseModel):
    status: RequestItemStatus
    quantity_delivered: Optional[int] = None
    quantity_returned: Optional[int] = None
    warehouse_id: Optional[int] = None
    location_id: Optional[int] = None

class RequestItemResponse(RequestItemBase):
    id: int
    request_id: int
    quantity_approved: int
    quantity_delivered: int
    quantity_returned: int
    status: RequestItemStatus
    
    class Config:
        from_attributes = True

# --- Request Tool ---
class RequestToolBase(BaseModel):
    tool_id: int
    assigned_to: Optional[int] = None
    expected_return_date: Optional[date] = None

class RequestToolCreate(RequestToolBase):
    pass

class RequestToolUpdate(BaseModel):
    condition_out: Optional[str] = None
    condition_in: Optional[str] = None
    status: Optional[RequestToolStatus] = None
    damage_notes: Optional[str] = None
    penalty_applied: Optional[bool] = None

class RequestToolStatusUpdate(BaseModel):
    status: RequestToolStatus
    assigned_to: Optional[int] = None
    condition_in: Optional[str] = None

class RequestToolResponse(RequestToolBase):
    id: int
    request_id: int
    condition_out: Optional[str] = None
    condition_in: Optional[str] = None
    checked_out_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None
    status: RequestToolStatus
    damage_notes: Optional[str] = None
    penalty_applied: bool
    
    class Config:
        from_attributes = True

# --- Request EPP ---
class RequestEPPBase(BaseModel):
    epp_id: int
    assigned_to: Optional[int] = None
    expected_return_date: Optional[date] = None

class RequestEPPCreate(RequestEPPBase):
    pass

class RequestEPPUpdate(BaseModel):
    condition_out: Optional[str] = None
    condition_in: Optional[str] = None
    status: Optional[RequestEPPStatus] = None
    inspection_notes: Optional[str] = None

class RequestEPPStatusUpdate(BaseModel):
    status: RequestEPPStatus
    assigned_to: Optional[int] = None
    condition_in: Optional[str] = None
    is_disposed: Optional[bool] = False

class RequestEPPResponse(RequestEPPBase):
    id: int
    request_id: int
    checkout_date: Optional[datetime] = None
    checkin_date: Optional[datetime] = None
    condition_out: Optional[str] = None
    condition_in: Optional[str] = None
    status: RequestEPPStatus
    inspection_notes: Optional[str] = None

    class Config:
        from_attributes = True

# --- Request Vehicle ---
class RequestVehicleBase(BaseModel):
    vehicle_id: int
    assigned_to: Optional[int] = None

class RequestVehicleCreate(RequestVehicleBase):
    pass

class RequestVehicleUpdate(BaseModel):
    odometer_out: Optional[int] = None
    odometer_in: Optional[int] = None
    fuel_level_out: Optional[FuelLevel] = None
    fuel_level_in: Optional[FuelLevel] = None
    status: Optional[RequestVehicleStatus] = None
    incident_report: Optional[str] = None
    return_notes: Optional[str] = None

class RequestVehicleStatusUpdate(BaseModel):
    status: RequestVehicleStatus
    assigned_to: Optional[int] = None
    odometer_in: Optional[int] = None
    fuel_level_in: Optional[FuelLevel] = None
    return_notes: Optional[str] = None

class RequestVehicleResponse(RequestVehicleBase):
    id: int
    request_id: int
    odometer_out: Optional[int] = None
    odometer_in: Optional[int] = None
    fuel_level_out: Optional[FuelLevel] = None
    fuel_level_in: Optional[FuelLevel] = None
    checkout_date: Optional[datetime] = None
    checkin_date: Optional[datetime] = None
    status: RequestVehicleStatus
    incident_report: Optional[str] = None
    return_notes: Optional[str] = None

    class Config:
        from_attributes = True

# --- Tracking ---
class RequestTrackingResponse(BaseModel):
    id: int
    request_id: int
    item_type: RequestTrackingItemType
    item_id: int
    action: RequestTrackingAction
    performed_by: int
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Integrated Request ---
class IntegratedRequestBase(BaseModel):
    purpose: IntegratedRequestPurpose
    project_code: Optional[str] = None
    expected_return_date: Optional[date] = None
    notes: Optional[str] = None
    emergency_level: Optional[EmergencyLevel] = EmergencyLevel.NORMAL

class IntegratedRequestCreate(IntegratedRequestBase):
    # Optional initial items
    items: Optional[List[RequestItemCreate]] = []
    tools: Optional[List[RequestToolCreate]] = []
    epp_items: Optional[List[RequestEPPCreate]] = []
    vehicles: Optional[List[RequestVehicleCreate]] = []

class IntegratedRequestUpdate(BaseModel):
    purpose: Optional[IntegratedRequestPurpose] = None
    project_code: Optional[str] = None
    expected_return_date: Optional[date] = None
    notes: Optional[str] = None
    emergency_level: Optional[EmergencyLevel] = None
    status: Optional[IntegratedRequestStatus] = None

class IntegratedRequestResponse(IntegratedRequestBase):
    id: int
    request_number: str
    requested_by: int
    status: IntegratedRequestStatus
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    delivered_by: Optional[int] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    items: List[RequestItemResponse] = []
    tools: List[RequestToolResponse] = []
    epp_items: List[RequestEPPResponse] = []
    vehicles: List[RequestVehicleResponse] = []
    tracking: List[RequestTrackingResponse] = []

    class Config:
        from_attributes = True
