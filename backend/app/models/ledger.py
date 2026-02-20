from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.user import Base

class LedgerEntryType(str, enum.Enum):
    INCREMENT = "increment"
    DECREMENT = "decrement"

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    movement_request_id = Column(Integer, ForeignKey("movement_requests.id"), nullable=False)
    
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    
    entry_type = Column(Enum(LedgerEntryType, native_enum=False), nullable=False)
    quantity = Column(Integer, nullable=False) # Always positive, direction determined by entry_type
    
    previous_balance = Column(Integer, nullable=False)
    new_balance = Column(Integer, nullable=False)
    
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    applied_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    movement_request = relationship("MovementRequest")
    product = relationship("Product")
    batch = relationship("ProductBatch")
    warehouse = relationship("Warehouse")
    location = relationship("StorageLocation")
    applicator = relationship("User", foreign_keys=[applied_by])
