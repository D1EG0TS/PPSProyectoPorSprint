from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class SupplierStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    BLOCKED = "blocked"


class SupplierCategory(str, enum.Enum):
    RAW_MATERIALS = "raw_materials"
    FINISHED_GOODS = "finished_goods"
    EQUIPMENT = "equipment"
    SERVICES = "services"
    PACKAGING = "packaging"
    OTHER = "other"


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True, default="México")
    postal_code = Column(String(20), nullable=True)
    
    tax_id = Column(String(50), nullable=True)
    rfc = Column(String(20), nullable=True)
    
    category = Column(Enum(SupplierCategory), default=SupplierCategory.OTHER)
    status = Column(Enum(SupplierStatus), default=SupplierStatus.ACTIVE, index=True)
    
    payment_terms_days = Column(Integer, default=30)
    credit_limit = Column(Numeric(12, 2), nullable=True)
    rating = Column(Integer, nullable=True)
    
    notes = Column(Text, nullable=True)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(Integer, nullable=False)
    updated_at = Column(Integer, nullable=True)
    
    is_active = Column(Boolean, default=True, index=True)

    creator = relationship("User", foreign_keys=[created_by], lazy="select")
    updater = relationship("User", foreign_keys=[updated_by], lazy="select")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier", lazy="select")
