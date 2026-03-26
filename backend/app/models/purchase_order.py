from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, ForeignKey, Numeric, Date
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class PurchaseOrderStatus(str, enum.Enum):
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


class PurchaseOrderPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_sku = Column(String(100), nullable=True)
    product_name = Column(String(255), nullable=False)
    
    quantity = Column(Numeric(12, 3), nullable=False)
    quantity_received = Column(Numeric(12, 3), default=0)
    
    unit_price = Column(Numeric(12, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False)
    
    expected_delivery_date = Column(Date, nullable=True)
    actual_delivery_date = Column(Date, nullable=True)
    
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="pending")
    
    created_at = Column(Integer, nullable=False)
    updated_at = Column(Integer, nullable=True)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", lazy="select")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    
    status = Column(Enum(PurchaseOrderStatus), default=PurchaseOrderStatus.DRAFT, index=True)
    priority = Column(Enum(PurchaseOrderPriority), default=PurchaseOrderPriority.NORMAL)
    
    subtotal = Column(Numeric(12, 2), default=0)
    tax_amount = Column(Numeric(12, 2), default=0)
    shipping_cost = Column(Numeric(12, 2), default=0)
    total_amount = Column(Numeric(12, 2), default=0)
    
    currency = Column(String(10), default="MXN")
    exchange_rate = Column(Numeric(10, 4), default=1)
    
    expected_delivery_date = Column(Date, nullable=True)
    actual_delivery_date = Column(Date, nullable=True)
    
    shipping_address = Column(Text, nullable=True)
    billing_address = Column(Text, nullable=True)
    
    notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(Integer, nullable=True)
    
    sent_at = Column(Integer, nullable=True)
    confirmed_at = Column(Integer, nullable=True)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(Integer, nullable=False)
    updated_at = Column(Integer, nullable=True)
    
    is_active = Column(Boolean, default=True, index=True)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    approver = relationship("User", foreign_keys=[approved_by], lazy="select")
    creator = relationship("User", foreign_keys=[created_by], lazy="select")
    updater = relationship("User", foreign_keys=[updated_by], lazy="select")
