from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date
from decimal import Decimal
from enum import Enum


class SupplierStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    BLOCKED = "blocked"


class SupplierCategory(str, Enum):
    RAW_MATERIALS = "raw_materials"
    FINISHED_GOODS = "finished_goods"
    EQUIPMENT = "equipment"
    SERVICES = "services"
    PACKAGING = "packaging"
    OTHER = "other"


class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    mobile: Optional[str] = Field(None, max_length=50)
    
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    
    tax_id: Optional[str] = Field(None, max_length=50)
    rfc: Optional[str] = Field(None, max_length=20)
    
    category: Optional[SupplierCategory] = SupplierCategory.OTHER
    status: Optional[SupplierStatus] = SupplierStatus.ACTIVE
    
    payment_terms_days: Optional[int] = Field(default=30, ge=0)
    credit_limit: Optional[Decimal] = Field(None, ge=0)
    rating: Optional[int] = Field(None, ge=1, le=5)
    
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    
    contact_person: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    mobile: Optional[str] = Field(None, max_length=50)
    
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    
    tax_id: Optional[str] = Field(None, max_length=50)
    rfc: Optional[str] = Field(None, max_length=20)
    
    category: Optional[SupplierCategory] = None
    status: Optional[SupplierStatus] = None
    
    payment_terms_days: Optional[int] = Field(None, ge=0)
    credit_limit: Optional[Decimal] = Field(None, ge=0)
    rating: Optional[int] = Field(None, ge=1, le=5)
    
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    id: int
    code: str
    status: SupplierStatus
    is_active: bool
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: int
    updated_at: Optional[int] = None
    
    class Config:
        from_attributes = True


class SupplierListResponse(BaseModel):
    total: int
    suppliers: List[SupplierResponse]


class SupplierStats(BaseModel):
    total_suppliers: int
    active_suppliers: int
    pending_suppliers: int
    blocked_suppliers: int
    total_orders: int
    pending_orders: int
    total_amount: Decimal
