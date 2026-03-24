from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from app.models.movement import MovementType, MovementStatus, MovementPurpose, MovementPriority, ItemPriority, QualityStatus, StorageCondition


class MovementRequestItemBase(BaseModel):
    product_id: int
    batch_id: Optional[int] = None
    quantity: int
    quantity_delivered: int = 0
    notes: Optional[str] = None
    source_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    lot_number: Optional[str] = None
    serial_number: Optional[str] = None
    container_code: Optional[str] = None
    priority: ItemPriority = ItemPriority.NORMAL
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    storage_conditions: StorageCondition = StorageCondition.AMBIENT
    quality_status: QualityStatus = QualityStatus.PENDING_QC
    unit_cost: Optional[float] = None
    status: str = "PENDING"


class MovementRequestItemCreate(MovementRequestItemBase):
    pass


class MovementRequestItem(MovementRequestItemBase):
    id: int
    request_id: int

    model_config = ConfigDict(from_attributes=True)


class MovementBase(BaseModel):
    type: MovementType
    product_id: int
    warehouse_id: int
    location_id: Optional[int] = None
    quantity: int
    previous_balance: int
    new_balance: int
    lot_number: Optional[str] = None
    serial_number: Optional[str] = None


class Movement(MovementBase):
    id: int
    movement_request_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MovementRequestBase(BaseModel):
    type: MovementType
    source_warehouse_id: Optional[int] = None
    destination_warehouse_id: Optional[int] = None
    reason: Optional[str] = None
    reference: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    movement_purpose: Optional[MovementPurpose] = None
    operator_notes: Optional[str] = None
    expected_date: Optional[datetime] = None
    priority: MovementPriority = MovementPriority.NORMAL
    department: Optional[str] = None
    cost_center: Optional[str] = None


class MovementRequestCreate(MovementRequestBase):
    items: List[MovementRequestItemCreate]


class MovementRequestUpdate(BaseModel):
    type: Optional[MovementType] = None
    status: Optional[MovementStatus] = None
    source_warehouse_id: Optional[int] = None
    destination_warehouse_id: Optional[int] = None
    reason: Optional[str] = None
    reference: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    movement_purpose: Optional[MovementPurpose] = None
    operator_notes: Optional[str] = None
    expected_date: Optional[datetime] = None
    priority: Optional[MovementPriority] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None


class MovementRequestReview(BaseModel):
    notes: Optional[str] = None


class MovementRequest(MovementRequestBase):
    id: int
    request_number: str
    status: MovementStatus
    requested_by: int
    approved_by: Optional[int] = None
    approval_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    items: List[MovementRequestItem] = []
    movements: List[Movement] = []

    model_config = ConfigDict(from_attributes=True)


class MovementTrackingEventBase(BaseModel):
    event_type: str
    event_description: Optional[str] = None
    location_name: Optional[str] = None
    notes: Optional[str] = None


class MovementTrackingEventCreate(MovementTrackingEventBase):
    request_id: int
    performed_by: int


class MovementTrackingEvent(MovementTrackingEventBase):
    id: int
    request_id: int
    performed_by: int
    performed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MovementDocumentBase(BaseModel):
    document_type: str
    file_name: str
    file_path: str
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    description: Optional[str] = None


class MovementDocumentCreate(MovementDocumentBase):
    request_id: int
    item_id: Optional[int] = None
    uploaded_by: int


class MovementDocument(MovementDocumentBase):
    id: int
    request_id: int
    item_id: Optional[int] = None
    uploaded_by: int
    uploaded_at: datetime
    verified: bool
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MovementRequestWithDetails(MovementRequest):
    tracking_events: List[MovementTrackingEvent] = []
    documents: List[MovementDocument] = []

    model_config = ConfigDict(from_attributes=True)
