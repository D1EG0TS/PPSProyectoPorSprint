from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class LocationAuditLogBase(BaseModel):
    location_id: int
    product_id: Optional[int] = None
    action: str
    previous_quantity: int
    new_quantity: int
    user_id: int
    movement_id: Optional[int] = None

class LocationAuditLogCreate(LocationAuditLogBase):
    pass

class LocationAuditLogResponse(LocationAuditLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
