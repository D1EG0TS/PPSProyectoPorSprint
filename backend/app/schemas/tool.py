from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.tool import ToolStatus

class ToolBase(BaseModel):
    product_id: int
    serial_number: str
    condition_id: int
    location_id: Optional[int] = None
    assigned_to: Optional[int] = None
    status: ToolStatus = ToolStatus.AVAILABLE

class ToolCreate(ToolBase):
    pass

class ToolUpdate(BaseModel):
    product_id: Optional[int] = None
    serial_number: Optional[str] = None
    condition_id: Optional[int] = None
    location_id: Optional[int] = None
    assigned_to: Optional[int] = None
    status: Optional[ToolStatus] = None

class ToolResponse(ToolBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ToolHistoryResponse(BaseModel):
    id: int
    tool_id: int
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    from_user_id: Optional[int] = None
    to_user_id: Optional[int] = None
    from_location_id: Optional[int] = None
    to_location_id: Optional[int] = None
    changed_by: int
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ToolAssignRequest(BaseModel):
    user_id: int
    notes: Optional[str] = None

class ToolCheckInRequest(BaseModel):
    location_id: int
    condition_id: Optional[int] = None
    notes: Optional[str] = None
