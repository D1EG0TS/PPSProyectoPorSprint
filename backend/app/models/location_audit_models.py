from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.user import Base

class LocationAuditLog(Base):
    __tablename__ = "location_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    action = Column(String(50), nullable=False) # stock_in, stock_out, relocation, adjustment
    previous_quantity = Column(Integer, nullable=False, default=0)
    new_quantity = Column(Integer, nullable=False, default=0)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    movement_id = Column(Integer, ForeignKey("movements.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    location = relationship("StorageLocation")
    product = relationship("Product")
    user = relationship("User")
    movement = relationship("Movement")
