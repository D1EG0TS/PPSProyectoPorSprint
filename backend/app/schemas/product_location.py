from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.product_location_models import AssignmentType

class ProductLocationAssignmentBase(BaseModel):
    product_id: int
    batch_id: Optional[int] = None
    location_id: int
    warehouse_id: int
    quantity: int
    assignment_type: AssignmentType = AssignmentType.MANUAL
    is_primary: bool = False
    notes: Optional[str] = None

class ProductLocationAssignmentCreate(ProductLocationAssignmentBase):
    assigned_by: Optional[int] = None # Can be inferred from context

class ProductLocationAssignmentUpdate(BaseModel):
    quantity: Optional[int] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None

class ProductLocationAssignmentResponse(ProductLocationAssignmentBase):
    id: int
    assigned_at: datetime
    assigned_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ProductRelocationRequest(BaseModel):
    from_location_id: int
    to_location_id: int
    quantity: int
    reason: Optional[str] = None
