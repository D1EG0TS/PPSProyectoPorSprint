from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.purchase import PurchaseAlertReason, PurchaseAlertStatus

class PurchaseAlertBase(BaseModel):
    product_id: Optional[int] = None
    tool_id: Optional[int] = None
    epp_id: Optional[int] = None
    reason: PurchaseAlertReason
    status: PurchaseAlertStatus = PurchaseAlertStatus.PENDING
    priority: str = "MEDIUM"
    quantity_needed: int = 1
    notes: Optional[str] = None

class PurchaseAlertCreate(PurchaseAlertBase):
    pass

class PurchaseAlertUpdate(BaseModel):
    status: Optional[PurchaseAlertStatus] = None
    notes: Optional[str] = None
    priority: Optional[str] = None

class PurchaseAlertResponse(PurchaseAlertBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Optional nested details
    product_name: Optional[str] = None
    tool_name: Optional[str] = None
    epp_name: Optional[str] = None

    class Config:
        from_attributes = True
