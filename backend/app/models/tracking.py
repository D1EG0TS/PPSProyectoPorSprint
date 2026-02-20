import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.user import Base
from app.models.integrated_request import RequestTrackingItemType

class ItemTracking(Base):
    __tablename__ = "item_tracking"

    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(Enum(RequestTrackingItemType), nullable=False)
    item_id = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    request_id = Column(Integer, ForeignKey("integrated_requests.id"), nullable=True)
    
    # Relationships
    recorder = relationship("User", foreign_keys=[recorded_by])
    request = relationship("IntegratedRequest")

class PenalizationReason(str, enum.Enum):
    LATE_RETURN = 'late_return'
    DAMAGE = 'damage'
    LOSS = 'loss'
    OTHER = 'other'

class PenalizationStatus(str, enum.Enum):
    PENDING = 'pending'
    PAID = 'paid'
    WAIVED = 'waived'

class Penalization(Base):
    __tablename__ = "penalizations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_id = Column(Integer, ForeignKey("integrated_requests.id"), nullable=True)
    item_type = Column(Enum(RequestTrackingItemType), nullable=True)
    item_id = Column(Integer, nullable=True)
    
    amount = Column(Float, default=0.0) # Monetary value
    points = Column(Integer, default=0) # Penalty points
    
    reason = Column(Enum(PenalizationReason), nullable=False)
    status = Column(Enum(PenalizationStatus), default=PenalizationStatus.PENDING)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="penalizations")
    creator = relationship("User", foreign_keys=[created_by])
    request = relationship("IntegratedRequest")
