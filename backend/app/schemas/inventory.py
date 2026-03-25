from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class ScanResult(BaseModel):
    found: bool
    product_id: Optional[int] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    current_stock: int = 0
    min_stock: int = 0
    has_batch: bool = False
    has_expiration: bool = False
    locations: List[dict] = []


class ReceiveItem(BaseModel):
    product_id: int
    quantity: int
    batch_number: Optional[str] = None
    expiration_date: Optional[date] = None
    location_id: Optional[int] = None


class ReceiveRequest(BaseModel):
    warehouse_id: int
    items: List[ReceiveItem]
    reference: Optional[str] = None
    notes: Optional[str] = None


class ReceiveResponse(BaseModel):
    success: bool
    movement_request_id: int
    request_number: str
    items_received: int
    message: str


class LocationCapacityUpdate(BaseModel):
    capacity: int


class LocationCapacityResponse(BaseModel):
    id: int
    code: str
    name: str
    capacity: int
    current_occupancy: int
    available: int

    model_config = ConfigDict(from_attributes=True)


class ScanRequest(BaseModel):
    code: str


class ProductLocationInfo(BaseModel):
    location_id: int
    location_code: str
    warehouse_name: str
    quantity: int
    batch_number: Optional[str] = None
    expiration_date: Optional[date] = None
    is_primary: bool = False


class AdjustmentReason(str, Enum):
    RECOUNT = "RECOUNT"
    DAMAGE = "DAMAGE"
    THEFT = "THEFT"
    EXPIRED = "EXPIRED"
    CORRECTION = "CORRECTION"
    OTHER = "OTHER"


class AdjustmentItem(BaseModel):
    product_id: int
    warehouse_id: int
    location_id: Optional[int] = None
    quantity: int  # Positive or negative
    reason: AdjustmentReason
    notes: Optional[str] = None


class AdjustmentRequest(BaseModel):
    items: List[AdjustmentItem]
    reference: Optional[str] = None


class AdjustmentResponse(BaseModel):
    success: bool
    movement_request_id: int
    request_number: str
    adjustments_count: int
    message: str


class AdjustmentHistoryItem(BaseModel):
    id: int
    request_number: str
    product_id: int
    product_name: str
    product_sku: str
    warehouse_id: int
    warehouse_name: str
    location_code: Optional[str] = None
    quantity_change: int
    previous_stock: int
    new_stock: int
    reason: str
    notes: Optional[str] = None
    adjusted_by: int
    adjusted_by_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdjustmentHistoryResponse(BaseModel):
    adjustments: List[AdjustmentHistoryItem]
    total: int
    page: int
    page_size: int


class CycleCountStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class CycleCountPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"


class CycleCountItem(BaseModel):
    product_id: int
    location_id: int
    system_stock: int
    counted_stock: Optional[int] = None
    variance: Optional[int] = None
    notes: Optional[str] = None


class CycleCountCreate(BaseModel):
    warehouse_id: int
    location_ids: Optional[List[int]] = None
    product_ids: Optional[List[int]] = None
    priority: CycleCountPriority = CycleCountPriority.NORMAL
    notes: Optional[str] = None


class CycleCountItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_sku: str
    location_id: int
    location_code: str
    system_stock: int
    counted_stock: Optional[int] = None
    variance: Optional[int] = None
    variance_percentage: Optional[float] = None
    notes: Optional[str] = None
    counted_by: Optional[int] = None
    counted_by_name: Optional[str] = None
    counted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CycleCountResponse(BaseModel):
    id: int
    request_number: str
    warehouse_id: int
    warehouse_name: str
    status: CycleCountStatus
    priority: CycleCountPriority
    total_items: int
    items_counted: int
    items_with_variance: int
    notes: Optional[str] = None
    created_by: int
    created_by_name: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CycleCountDetailResponse(CycleCountResponse):
    items: List[CycleCountItemResponse]


class CycleCountListResponse(BaseModel):
    counts: List[CycleCountResponse]
    total: int
    page: int
    page_size: int


class VarianceApproval(BaseModel):
    approve: bool
    apply_adjustment: bool = True
    notes: Optional[str] = None


class VarianceApprovalRequest(BaseModel):
    approvals: List[Dict[str, Any]]


class TransferItem(BaseModel):
    product_id: int
    quantity: int
    source_location_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    batch_number: Optional[str] = None


class TransferRequest(BaseModel):
    source_warehouse_id: int
    destination_warehouse_id: int
    items: List[TransferItem]
    reference: Optional[str] = None
    notes: Optional[str] = None


class TransferResponse(BaseModel):
    success: bool
    movement_request_id: int
    request_number: str
    items_transferred: int
    message: str


class TransferHistoryItem(BaseModel):
    id: int
    request_number: str
    product_id: int
    product_name: str
    product_sku: str
    source_warehouse_id: int
    source_warehouse_name: str
    destination_warehouse_id: int
    destination_warehouse_name: str
    source_location_code: Optional[str] = None
    destination_location_code: Optional[str] = None
    quantity: int
    notes: Optional[str] = None
    transferred_by: int
    transferred_by_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransferHistoryResponse(BaseModel):
    transfers: List[TransferHistoryItem]
    total: int
    page: int
    page_size: int


class ExpiringProductItem(BaseModel):
    product_id: int
    product_name: str
    product_sku: str
    batch_number: Optional[str] = None
    warehouse_name: str
    location_code: Optional[str] = None
    quantity: int
    expiration_date: date
    days_until_expiry: int
    is_expired: bool

    model_config = ConfigDict(from_attributes=True)


class ExpiringProductsResponse(BaseModel):
    products: List[ExpiringProductItem]
    total: int
    expired_count: int
    expiring_soon_count: int


class LowStockItem(BaseModel):
    product_id: int
    product_name: str
    product_sku: str
    category: Optional[str] = None
    current_stock: int
    min_stock: int
    max_stock: Optional[int] = None
    stock_percentage: float
    warehouse_name: Optional[str] = None
    last_updated: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LowStockResponse(BaseModel):
    products: List[LowStockItem]
    total: int
    critical_count: int
    warning_count: int


class InventorySummaryCategory(BaseModel):
    category_id: Optional[int]
    category_name: str
    total_products: int
    total_stock: int
    total_value: Optional[float] = None


class InventorySummaryWarehouse(BaseModel):
    warehouse_id: int
    warehouse_name: str
    warehouse_code: str
    total_products: int
    total_stock: int
    low_stock_count: int
    expiring_soon_count: int


class InventorySummaryResponse(BaseModel):
    total_products: int
    total_stock: int
    total_value: Optional[float] = None
    low_stock_count: int
    expiring_soon_count: int
    out_of_stock_count: int
    by_category: List[InventorySummaryCategory]
    by_warehouse: List[InventorySummaryWarehouse]
