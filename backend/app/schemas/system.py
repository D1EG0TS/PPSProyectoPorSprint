from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime

class SystemConfigBase(BaseModel):
    value: str
    description: Optional[str] = None

class SystemConfigCreate(SystemConfigBase):
    key: str

class SystemConfigUpdate(SystemConfigBase):
    pass

class SystemConfig(SystemConfigBase):
    key: str

    model_config = ConfigDict(from_attributes=True)

class SystemHealth(BaseModel):
    status: str
    database: str
    timestamp: datetime
    version: str

class SystemMetrics(BaseModel):
    total_users: int
    active_users: int
    total_products: int
    total_movements: int
    # Add other metrics as needed

class AuditLogOut(BaseModel):
    id: int
    user_id: int
    changed_by: Optional[int]
    action: str
    details: Optional[str]
    created_at: datetime
    target_user_email: Optional[str] = None
    actor_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
