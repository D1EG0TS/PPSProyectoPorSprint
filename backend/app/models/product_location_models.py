from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.user import Base
import enum

class AssignmentType(str, enum.Enum):
    MANUAL = "manual"
    MOVEMENT = "movement"
    AUTO = "auto"

class ProductLocationAssignment(Base):
    __tablename__ = "product_location_assignments"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True) # Redundant but good for performance
    
    quantity = Column(Integer, default=0, nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    assignment_type = Column(Enum(AssignmentType), default=AssignmentType.MANUAL)
    is_primary = Column(Boolean, default=False) # Is this the primary picking slot?
    notes = Column(Text, nullable=True)

    # Relationships
    product = relationship("Product")
    batch = relationship("ProductBatch")
    location = relationship("StorageLocation", back_populates="product_assignments")
    warehouse = relationship("Warehouse")
    assigner = relationship("User")
