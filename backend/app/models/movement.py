from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.user import Base

class MovementType(str, enum.Enum):
    IN = "IN"           # Entrada (compra, devolución)
    OUT = "OUT"         # Salida (venta, merma)
    TRANSFER = "TRANSFER" # Transferencia entre almacenes
    ADJUSTMENT = "ADJUSTMENT" # Ajuste de inventario (conteo físico)

class MovementStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class MovementRequest(Base):
    __tablename__ = "movement_requests"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(MovementType), nullable=False)
    status = Column(Enum(MovementStatus), default=MovementStatus.DRAFT, nullable=False)
    
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    source_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True) # Origen (null para IN)
    destination_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True) # Destino (null para OUT/ADJUSTMENT)
    
    reason = Column(Text, nullable=True)
    approval_notes = Column(Text, nullable=True)
    reference = Column(String(100), nullable=True) # External ref (PO #, Order #)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    requester = relationship("User", foreign_keys=[requested_by], backref="requested_movements")
    approver = relationship("User", foreign_keys=[approved_by], backref="approved_movements")
    source_warehouse = relationship("Warehouse", foreign_keys=[source_warehouse_id], backref="outgoing_requests")
    destination_warehouse = relationship("Warehouse", foreign_keys=[destination_warehouse_id], backref="incoming_requests")
    
    items = relationship("MovementRequestItem", back_populates="request", cascade="all, delete-orphan")
    movements = relationship("Movement", back_populates="request")


class MovementRequestItem(Base):
    __tablename__ = "movement_request_items"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("movement_requests.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=True) # Optional batch
    
    quantity = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    request = relationship("MovementRequest", back_populates="items")
    product = relationship("Product")
    batch = relationship("ProductBatch")


class Movement(Base):
    """
    Ledger table recording actual stock changes.
    """
    __tablename__ = "movements"

    id = Column(Integer, primary_key=True, index=True)
    movement_request_id = Column(Integer, ForeignKey("movement_requests.id"), nullable=True) # Can be null if manual/direct? Usually linked.
    
    type = Column(Enum(MovementType), nullable=False)
    
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    
    quantity = Column(Integer, nullable=False) # Positive (add) or Negative (remove)
    
    previous_balance = Column(Integer, nullable=False, default=0) # Snapshot before
    new_balance = Column(Integer, nullable=False, default=0) # Snapshot after
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    request = relationship("MovementRequest", back_populates="movements")
    product = relationship("Product")
    warehouse = relationship("Warehouse")
