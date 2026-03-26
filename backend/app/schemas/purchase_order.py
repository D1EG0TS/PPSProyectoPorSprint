from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class PurchaseOrderStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    SENT = "sent"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class PurchaseOrderPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class PurchaseOrderItemBase(BaseModel):
    product_id: Optional[int] = None
    product_sku: Optional[str] = Field(None, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=255)
    
    quantity: Decimal = Field(..., gt=0)
    quantity_received: Optional[Decimal] = Decimal("0")
    
    unit_price: Decimal = Field(..., ge=0)
    total_price: Optional[Decimal] = None
    
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemUpdate(BaseModel):
    product_id: Optional[int] = None
    product_sku: Optional[str] = Field(None, max_length=100)
    product_name: Optional[str] = Field(None, min_length=1, max_length=255)
    
    quantity: Optional[Decimal] = Field(None, gt=0)
    quantity_received: Optional[Decimal] = Field(None, ge=0)
    
    unit_price: Optional[Decimal] = Field(None, ge=0)
    
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    purchase_order_id: int
    quantity_received: Decimal
    total_price: Decimal
    actual_delivery_date: Optional[date] = None
    status: str
    created_at: int
    updated_at: Optional[int] = None
    
    class Config:
        from_attributes = True


class PurchaseOrderBase(BaseModel):
    supplier_id: int
    
    priority: Optional[PurchaseOrderPriority] = PurchaseOrderPriority.NORMAL
    
    expected_delivery_date: Optional[date] = None
    
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    
    currency: Optional[str] = Field(default="MXN", max_length=10)
    exchange_rate: Optional[Decimal] = Field(default=Decimal("1"), ge=0)
    shipping_cost: Optional[Decimal] = Field(default=Decimal("0"), ge=0)


class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate] = Field(default_factory=list)


class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    
    priority: Optional[PurchaseOrderPriority] = None
    status: Optional[PurchaseOrderStatus] = None
    
    expected_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    
    shipping_cost: Optional[Decimal] = Field(None, ge=0)
    approved_by: Optional[int] = None
    approved_at: Optional[int] = None


class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    order_number: str
    status: PurchaseOrderStatus
    
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    
    actual_delivery_date: Optional[date] = None
    
    approved_by: Optional[int] = None
    approved_at: Optional[int] = None
    sent_at: Optional[int] = None
    confirmed_at: Optional[int] = None
    
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: int
    updated_at: Optional[int] = None
    is_active: bool
    
    items: List[PurchaseOrderItemResponse] = []
    
    class Config:
        from_attributes = True


class PurchaseOrderListResponse(BaseModel):
    total: int
    orders: List[PurchaseOrderResponse]


class PurchaseOrderStats(BaseModel):
    total_orders: int
    draft_orders: int
    pending_orders: int
    approved_orders: int
    received_orders: int
    cancelled_orders: int
    total_amount: Decimal
    pending_amount: Decimal
