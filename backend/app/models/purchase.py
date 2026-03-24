from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class PurchaseAlertReason(str, enum.Enum):
    LOW_STOCK = "LOW_STOCK"
    DAMAGED = "DAMAGED"
    LOST = "LOST"
    DISPOSED = "DISPOSED"
    CONSUMED = "CONSUMED"

class PurchaseAlertStatus(str, enum.Enum):
    PENDING = "PENDING"
    REVIEWED = "REVIEWED"
    ORDERED = "ORDERED"
    IGNORED = "IGNORED"

class PurchaseAlert(Base):
    __tablename__ = "purchase_alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=True)
    epp_id = Column(Integer, ForeignKey("epp.id"), nullable=True)
    
    reason = Column(Enum(PurchaseAlertReason), nullable=False)
    status = Column(Enum(PurchaseAlertStatus), default=PurchaseAlertStatus.PENDING)
    priority = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH
    
    quantity_needed = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    
    # Relationships
    product = relationship("Product")
    tool = relationship("Tool")
    epp = relationship("EPP")
