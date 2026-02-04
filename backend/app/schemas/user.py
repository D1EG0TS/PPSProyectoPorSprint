from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- Role Schemas ---
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    level: int = 1

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    role_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    role: Optional[RoleResponse] = None

    model_config = ConfigDict(from_attributes=True)

class UserResetPassword(BaseModel):
    new_password: str

# --- Audit Schemas ---
class UserAuditResponse(BaseModel):
    id: int
    user_id: int
    changed_by: Optional[int]
    action: str
    details: Optional[str]
    created_at: datetime
    actor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
