import enum
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.user import Base

class EPPStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    EXPIRED = "EXPIRED"
    DAMAGED = "DAMAGED"
    REPLACED = "REPLACED"
    DISPOSED = "DISPOSED"

class EPP(Base):
    __tablename__ = "epp"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    serial_number = Column(String(100), unique=True, index=True, nullable=True)
    size = Column(String(20), nullable=True)
    certification = Column(String(100), nullable=True)
    assignment_date = Column(Date, nullable=True)
    expiration_date = Column(Date, nullable=True)
    useful_life_days = Column(Integer, nullable=True)
    status = Column(String(50), default=EPPStatus.AVAILABLE)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    product = relationship("Product")
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    inspections = relationship("EPPInspection", back_populates="epp", cascade="all, delete-orphan")

class EPPInspection(Base):
    __tablename__ = "epp_inspections"

    id = Column(Integer, primary_key=True, index=True)
    epp_id = Column(Integer, ForeignKey("epp.id"), nullable=False)
    inspection_date = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    passed = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    evidence_id = Column(String(100), nullable=True)

    # Relationships
    epp = relationship("EPP", back_populates="inspections")
    inspector = relationship("User", foreign_keys=[inspector_id])
