import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, Float, Boolean, Date
from sqlalchemy.orm import relationship
from app.database import Base


class MovementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    TRANSFER = "TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"


class MovementStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    APPLIED = "APPLIED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MovementPurpose(str, enum.Enum):
    STOCK_REPLENISHMENT = "STOCK_REPLENISHMENT"
    PROJECT_USE = "PROJECT_USE"
    MAINTENANCE = "MAINTENANCE"
    RETURN = "RETURN"
    SALE = "SALE"
    DAMAGE_CLAIM = "DAMAGE_CLAIM"
    OTHER = "OTHER"


class MovementPriority(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ItemPriority(str, enum.Enum):
    URGENT = "URGENT"
    NORMAL = "NORMAL"
    LOW = "LOW"


class QualityStatus(str, enum.Enum):
    PENDING_QC = "PENDING_QC"
    PASSED = "PASSED"
    FAILED = "FAILED"
    CONDITIONAL = "CONDITIONAL"


class StorageCondition(str, enum.Enum):
    AMBIENT = "AMBIENT"
    REFRIGERATED = "REFRIGERATED"
    FROZEN = "FROZEN"
    HUMIDITY_CONTROLLED = "HUMIDITY_CONTROLLED"
    HAZMAT = "HAZMAT"


class MovementRequest(Base):
    __tablename__ = "movement_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(String, nullable=False)
    status = Column(String, default=MovementStatus.DRAFT, nullable=False)

    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    source_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    destination_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)

    reason = Column(Text, nullable=True)
    approval_notes = Column(Text, nullable=True)
    reference = Column(String(100), nullable=True)

    project_name = Column(String(200), nullable=True)
    project_code = Column(String(50), nullable=True)
    movement_purpose = Column(String(50), nullable=True)
    operator_notes = Column(Text, nullable=True)

    priority = Column(String(20), default=MovementPriority.NORMAL.value, nullable=False)
    department = Column(String(100), nullable=True)
    cost_center = Column(String(50), nullable=True)

    received_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    delivered_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    expected_date = Column(DateTime(timezone=True), nullable=True)
    actual_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    requester = relationship("User", foreign_keys=[requested_by])
    approver = relationship("User", foreign_keys=[approved_by])
    receiver = relationship("User", foreign_keys=[received_by])
    deliverer = relationship("User", foreign_keys=[delivered_by])
    source_warehouse = relationship("Warehouse", foreign_keys=[source_warehouse_id])
    destination_warehouse = relationship("Warehouse", foreign_keys=[destination_warehouse_id])

    items = relationship("MovementRequestItem", back_populates="request", cascade="all, delete-orphan")
    movements = relationship("Movement", back_populates="request")
    tracking_events = relationship("MovementTrackingEvent", back_populates="request", cascade="all, delete-orphan")
    documents = relationship("MovementDocument", back_populates="request", cascade="all, delete-orphan")


class MovementRequestItem(Base):
    __tablename__ = "movement_request_items"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("movement_requests.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=True)

    quantity = Column(Integer, nullable=False)
    quantity_delivered = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    source_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    destination_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)

    lot_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True)
    container_code = Column(String(50), nullable=True)
    priority = Column(String(20), default=ItemPriority.NORMAL.value, nullable=False)
    
    manufacturing_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    storage_conditions = Column(String(50), default=StorageCondition.AMBIENT.value, nullable=False)
    quality_status = Column(String(50), default=QualityStatus.PENDING_QC.value, nullable=False)
    
    unit_cost = Column(Float, nullable=True)
    
    status = Column(String(50), default="PENDING", nullable=False)

    request = relationship("MovementRequest", back_populates="items")
    product = relationship("Product")
    source_location = relationship("StorageLocation", foreign_keys=[source_location_id])
    destination_location = relationship("StorageLocation", foreign_keys=[destination_location_id])
    documents = relationship("MovementDocument", back_populates="item", cascade="all, delete-orphan")


class Movement(Base):
    __tablename__ = "movements"

    id = Column(Integer, primary_key=True, index=True)
    movement_request_id = Column(Integer, ForeignKey("movement_requests.id"), nullable=True)

    type = Column(Enum(MovementType), nullable=False)

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True, index=True)

    quantity = Column(Integer, nullable=False)

    previous_balance = Column(Integer, nullable=False, default=0)
    new_balance = Column(Integer, nullable=False, default=0)
    
    lot_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), index=True)

    request = relationship("MovementRequest", back_populates="movements")
    product = relationship("Product")
    warehouse = relationship("Warehouse")
    location = relationship("StorageLocation")
