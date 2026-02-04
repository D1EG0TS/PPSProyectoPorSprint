from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.movement import MovementType, MovementStatus

# Shared properties
class MovementRequestItemBase(BaseModel):
    product_id: int
    batch_id: Optional[int] = None
    quantity: int
    notes: Optional[str] = None

class MovementRequestItemCreate(MovementRequestItemBase):
    pass

class MovementRequestItem(MovementRequestItemBase):
    id: int
    request_id: int

    class Config:
        from_attributes = True

# Ledger Schemas
class MovementBase(BaseModel):
    type: MovementType
    product_id: int
    warehouse_id: int
    quantity: int
    previous_balance: int
    new_balance: int

class Movement(MovementBase):
    id: int
    movement_request_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Request Schemas
class MovementRequestBase(BaseModel):
    type: MovementType
    source_warehouse_id: Optional[int] = None
    destination_warehouse_id: Optional[int] = None
    reason: Optional[str] = None
    reference: Optional[str] = None

class MovementRequestCreate(MovementRequestBase):
    items: List[MovementRequestItemCreate]

class MovementRequestUpdate(BaseModel):
    status: Optional[MovementStatus] = None
    reason: Optional[str] = None
    reference: Optional[str] = None

class MovementRequestReview(BaseModel):
    notes: Optional[str] = None

class MovementRequest(MovementRequestBase):
    id: int
    status: MovementStatus
    requested_by: int
    approved_by: Optional[int] = None
    approval_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[MovementRequestItem] = []
    movements: List[Movement] = []

    class Config:
        from_attributes = True
