from typing import List, Optional, Any, Dict
from datetime import date, datetime
from pydantic import BaseModel, Field
from app.models.assets import (
    AssetType, DepreciationMethod, AssetStatus, AssetCondition, 
    AttributeType, MaintenanceType, MaintenanceStatus, CalibrationStatus, 
    AssetAction, AssignmentStatus
)

# Asset Category
class AssetCategoryBase(BaseModel):
    code: str
    name: str
    asset_type: AssetType
    requires_calibration: bool = False
    requires_maintenance: bool = False
    depreciable: bool = False
    useful_life_months: Optional[int] = None
    depreciation_method: DepreciationMethod = DepreciationMethod.NONE

class AssetCategoryCreate(AssetCategoryBase):
    pass

class AssetCategoryUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    asset_type: Optional[AssetType] = None
    requires_calibration: Optional[bool] = None
    requires_maintenance: Optional[bool] = None
    depreciable: Optional[bool] = None
    useful_life_months: Optional[int] = None
    depreciation_method: Optional[DepreciationMethod] = None

class AssetCategory(AssetCategoryBase):
    id: int
    
    class Config:
        from_attributes = True

# Asset Attribute
class AssetAttributeBase(BaseModel):
    attribute_name: str
    attribute_value: Optional[str] = None
    attribute_type: AttributeType = AttributeType.TEXTO

class AssetAttributeCreate(AssetAttributeBase):
    pass

class AssetAttribute(AssetAttributeBase):
    id: int
    asset_id: int

    class Config:
        from_attributes = True

# Asset
class AssetBase(BaseModel):
    category_id: int
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    barcode: Optional[str] = None
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[float] = None
    supplier: Optional[str] = None
    invoice_number: Optional[str] = None
    warranty_expiration: Optional[date] = None
    location_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    responsible_user_id: Optional[int] = None
    status: AssetStatus = AssetStatus.DISPONIBLE
    condition: AssetCondition = AssetCondition.NUEVO
    notes: Optional[str] = None

class AssetCreate(AssetBase):
    asset_tag: Optional[str] = None
    attributes: Optional[List[AssetAttributeCreate]] = []

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    barcode: Optional[str] = None
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[float] = None
    supplier: Optional[str] = None
    invoice_number: Optional[str] = None
    warranty_expiration: Optional[date] = None
    location_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    responsible_user_id: Optional[int] = None
    status: Optional[AssetStatus] = None
    condition: Optional[AssetCondition] = None
    notes: Optional[str] = None
    attributes: Optional[List[AssetAttributeCreate]] = None

class Asset(AssetBase):
    id: int
    asset_tag: str
    current_value: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    attributes: List[AssetAttribute] = []
    category: Optional[AssetCategory] = None

    class Config:
        from_attributes = True

# Maintenance
class AssetMaintenanceBase(BaseModel):
    asset_id: int
    maintenance_type: MaintenanceType
    service_date: Optional[date] = None
    description: Optional[str] = None
    technician: Optional[str] = None
    cost: Optional[float] = None
    invoice_number: Optional[str] = None
    next_maintenance_date: Optional[date] = None
    status: MaintenanceStatus = MaintenanceStatus.PROGRAMADO
    notes: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class AssetMaintenanceCreate(AssetMaintenanceBase):
    pass

class AssetMaintenanceUpdate(BaseModel):
    service_date: Optional[date] = None
    completion_date: Optional[date] = None
    description: Optional[str] = None
    technician: Optional[str] = None
    cost: Optional[float] = None
    invoice_number: Optional[str] = None
    next_maintenance_date: Optional[date] = None
    status: Optional[MaintenanceStatus] = None
    notes: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class AssetMaintenance(AssetMaintenanceBase):
    id: int
    completion_date: Optional[date] = None
    performed_by: Optional[int] = None
    approved_by: Optional[int] = None

    class Config:
        from_attributes = True

# Calibration
class AssetCalibrationBase(BaseModel):
    asset_id: int
    calibration_date: date
    expiration_date: Optional[date] = None
    certificate_number: Optional[str] = None
    calibration_lab: Optional[str] = None
    standard_used: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    deviation: Optional[float] = None
    tolerance: Optional[float] = None
    passed: bool = True
    adjusted: bool = False
    cost: Optional[float] = None
    certificate_url: Optional[str] = None
    next_calibration_date: Optional[date] = None
    status: CalibrationStatus = CalibrationStatus.VIGENTE

class AssetCalibrationCreate(AssetCalibrationBase):
    pass

class AssetCalibrationUpdate(BaseModel):
    calibration_date: Optional[date] = None
    expiration_date: Optional[date] = None
    certificate_number: Optional[str] = None
    calibration_lab: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    passed: Optional[bool] = None
    status: Optional[CalibrationStatus] = None

class AssetCalibration(AssetCalibrationBase):
    id: int
    performed_by: Optional[int] = None

    class Config:
        from_attributes = True

# Assignment
class AssetAssignmentBase(BaseModel):
    asset_id: int
    assigned_to: int
    expected_return_date: Optional[date] = None
    purpose: Optional[str] = None
    request_id: Optional[int] = None
    condition_out: Optional[str] = None

class AssetAssignmentCreate(AssetAssignmentBase):
    pass

class AssetAssignmentUpdate(BaseModel):
    return_date: Optional[datetime] = None
    condition_in: Optional[str] = None
    status: Optional[AssignmentStatus] = None

class AssetAssignment(AssetAssignmentBase):
    id: int
    assigned_by: Optional[int] = None
    assignment_date: datetime
    return_date: Optional[datetime] = None
    condition_in: Optional[str] = None
    status: AssignmentStatus

    class Config:
        from_attributes = True

# Audit Log
class AssetAuditLogBase(BaseModel):
    asset_id: int
    action: AssetAction
    previous_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    user_id: Optional[int] = None
    timestamp: datetime
    ip_address: Optional[str] = None

class AssetAuditLog(AssetAuditLogBase):
    id: int

    class Config:
        from_attributes = True
