from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict, ValidationInfo
from datetime import date, datetime
from decimal import Decimal
from app.models.vehicle_maintenance import MaintenanceCategory, MaintenanceStatus, MaintenancePriority

# --- Enums ---
# Re-exporting enums for convenience or just using them directly from models

# --- Parts ---
class MaintenancePartBase(BaseModel):
    part_name: str
    product_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    part_number: Optional[str] = None
    quantity: Decimal
    unit: Optional[str] = None
    unit_cost: Optional[Decimal] = None
    total_cost: Optional[Decimal] = None
    supplier: Optional[str] = None
    warranty_months: Optional[int] = None

class MaintenancePartCreate(MaintenancePartBase):
    pass

class MaintenancePartResponse(MaintenancePartBase):
    id: int
    maintenance_id: int

    model_config = ConfigDict(from_attributes=True)

# --- Attachments ---
class MaintenanceAttachmentBase(BaseModel):
    filename: str
    file_url: str
    file_type: Optional[str] = None
    description: Optional[str] = None

class MaintenanceAttachmentCreate(MaintenanceAttachmentBase):
    pass

class MaintenanceAttachmentResponse(MaintenanceAttachmentBase):
    id: int
    maintenance_id: int
    uploaded_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

# --- Maintenance Types ---
class MaintenanceTypeBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    category: MaintenanceCategory
    recommended_interval_km: Optional[int] = None
    recommended_interval_months: Optional[int] = None
    estimated_duration_hours: Optional[Decimal] = None
    is_active: bool = True

class MaintenanceTypeCreate(MaintenanceTypeBase):
    pass

class MaintenanceTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[MaintenanceCategory] = None
    recommended_interval_km: Optional[int] = None
    recommended_interval_months: Optional[int] = None
    estimated_duration_hours: Optional[Decimal] = None
    is_active: Optional[bool] = None

class MaintenanceTypeResponse(MaintenanceTypeBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- Maintenance Records ---
class MaintenanceRecordBase(BaseModel):
    vehicle_id: int
    maintenance_type_id: int
    odometer_at_service: Optional[int] = None
    service_date: date
    cost_amount: Optional[Decimal] = None
    cost_currency: str = 'MXN'
    provider_name: Optional[str] = None
    provider_contact: Optional[str] = None
    status: MaintenanceStatus = MaintenanceStatus.SCHEDULED
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    description: Optional[str] = None
    notes: Optional[str] = None
    requires_followup: bool = False
    followup_date: Optional[date] = None

class MaintenanceRecordCreate(MaintenanceRecordBase):
    parts: Optional[List[MaintenancePartCreate]] = []
    
    @field_validator('service_date')
    @classmethod
    def date_cannot_be_future(cls, v: date, info: ValidationInfo):
        # We allow future dates only if status is SCHEDULED (handled in logic or here)
        # But generic validation might be tricky without knowing status if it's not passed yet.
        # Logic layer is better for context-aware validation.
        return v

class MaintenanceRecordUpdate(BaseModel):
    odometer_at_service: Optional[int] = None
    service_date: Optional[date] = None
    cost_amount: Optional[Decimal] = None
    provider_name: Optional[str] = None
    status: Optional[MaintenanceStatus] = None
    priority: Optional[MaintenancePriority] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    requires_followup: Optional[bool] = None
    followup_date: Optional[date] = None
    # We don't typically update vehicle_id or type_id, but could be added if needed

class MaintenanceRecordResponse(MaintenanceRecordBase):
    id: int
    next_recommended_date: Optional[date] = None
    next_recommended_odometer: Optional[int] = None
    performed_by: Optional[int] = None
    approved_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Relationships
    maintenance_type: Optional[MaintenanceTypeResponse] = None
    parts: List[MaintenancePartResponse] = []
    attachments: List[MaintenanceAttachmentResponse] = []

    model_config = ConfigDict(from_attributes=True)

class MaintenanceRecordListResponse(BaseModel):
    id: int
    vehicle_id: int
    maintenance_type_name: str
    service_date: date
    status: MaintenanceStatus
    priority: MaintenancePriority
    cost_amount: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)

# --- Stats & Reports ---
class MaintenanceStatsResponse(BaseModel):
    vehicle_id: int
    total_cost: Decimal
    total_records: int
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    status_breakdown: dict

class UpcomingMaintenanceResponse(BaseModel):
    vehicle_id: int
    vehicle_name: str
    maintenance_type_name: str
    due_date: Optional[date] = None
    due_odometer: Optional[int] = None
    days_remaining: Optional[int] = None
    km_remaining: Optional[int] = None
    priority: str

class DashboardStats(BaseModel):
    total_cost_month: Decimal
    total_cost_year: Decimal
    count_by_type: dict
    count_by_status: dict
    monthly_costs: List[dict]
    top_vehicles_cost: List[dict]
    avg_downtime_days: float = 0.0
