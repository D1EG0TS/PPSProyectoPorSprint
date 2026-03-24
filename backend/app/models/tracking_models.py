import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, Enum, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class AddressType(str, enum.Enum):
    SHIPPING = "SHIPPING"
    RECEIVING = "RECEIVING"
    WAREHOUSE = "WAREHOUSE"
    PROJECT = "PROJECT"
    SUPPLIER = "SUPPLIER"
    CUSTOMER = "CUSTOMER"
    OTHER = "OTHER"


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    address_type = Column(Enum(AddressType), default=AddressType.OTHER, nullable=False)
    
    name = Column(String(200), nullable=False)
    alias = Column(String(100), nullable=True)
    
    street = Column(String(255), nullable=True)
    exterior_number = Column(String(20), nullable=True)
    interior_number = Column(String(20), nullable=True)
    neighborhood = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    municipality = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="México", nullable=False)
    postal_code = Column(String(20), nullable=True)
    
    coordinates = Column(JSON, nullable=True)
    
    reference = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    
    contact_name = Column(String(200), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(100), nullable=True)
    
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    creator = relationship("User", backref="addresses")


class TrackingEventType(str, enum.Enum):
    CREATED = "CREATED"
    UPDATED = "UPDATED"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DELIVERED = "DELIVERED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class MovementTrackingEvent(Base):
    __tablename__ = "movement_tracking_events"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("movement_requests.id"), nullable=False, index=True)
    
    event_type = Column(String(50), nullable=False)
    event_description = Column(String(500), nullable=True)
    
    location_name = Column(String(200), nullable=True)
    
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    performed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    
    notes = Column(Text, nullable=True)

    request = relationship("MovementRequest", back_populates="tracking_events")
    performer = relationship("User", foreign_keys=[performed_by])


class DocumentType(str, enum.Enum):
    DELIVERY_NOTE = "DELIVERY_NOTE"
    INVOICE = "INVOICE"
    RECEIPT = "RECEIPT"
    PACKING_LIST = "PACKING_LIST"
    QUALITY_CERTIFICATE = "QUALITY_CERTIFICATE"
    PHOTO = "PHOTO"
    DAMAGE_REPORT = "DAMAGE_REPORT"
    OTHER = "OTHER"


class MovementDocument(Base):
    __tablename__ = "movement_documents"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("movement_requests.id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("movement_request_items.id"), nullable=True)
    
    document_type = Column(String(50), nullable=False)
    
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_url = Column(String(1000), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    
    description = Column(Text, nullable=True)
    
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    
    verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    uploader = relationship("User", foreign_keys=[uploaded_by])
    verifier = relationship("User", foreign_keys=[verified_by])
    request = relationship("MovementRequest", back_populates="documents")
    item = relationship("MovementRequestItem", back_populates="documents")
