from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.integrated_request import RequestTrackingItemType
from app.models.tracking import PenalizationReason, PenalizationStatus

# --- Item Tracking ---
class ItemTrackingBase(BaseModel):
    item_type: RequestTrackingItemType
    item_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    request_id: Optional[int] = None

class ItemTrackingCreate(ItemTrackingBase):
    pass

class ItemTrackingResponse(ItemTrackingBase):
    id: int
    recorded_at: datetime
    recorded_by: Optional[int] = None

    class Config:
        from_attributes = True

# --- Penalization ---
class PenalizationBase(BaseModel):
    user_id: int
    request_id: Optional[int] = None
    item_type: Optional[RequestTrackingItemType] = None
    item_id: Optional[int] = None
    amount: float = 0.0
    points: int = 0
    reason: PenalizationReason
    notes: Optional[str] = None

class PenalizationCreate(PenalizationBase):
    pass

class PenalizationUpdate(BaseModel):
    status: Optional[PenalizationStatus] = None
    notes: Optional[str] = None

class PenalizationResponse(PenalizationBase):
    id: int
    status: PenalizationStatus
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True
