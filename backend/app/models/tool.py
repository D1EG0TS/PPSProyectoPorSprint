from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.user import Base
import enum

class ToolStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    MAINTENANCE = "MAINTENANCE"
    LOST = "LOST"
    DECOMMISSIONED = "DECOMMISSIONED"

class Tool(Base):
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    condition_id = Column(Integer, ForeignKey("conditions.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    status = Column(Enum(ToolStatus), default=ToolStatus.AVAILABLE, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    product = relationship("Product", backref="tools")
    condition = relationship("Condition")
    assignee = relationship("User", foreign_keys=[assigned_to], backref="assigned_tools")
    location = relationship("Location", backref="tools")
    history = relationship("ToolHistory", back_populates="tool", cascade="all, delete-orphan")

class ToolHistory(Base):
    __tablename__ = "tool_history"

    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
    action = Column(String(50), nullable=False) # ASSIGN, RETURN, STATUS_CHANGE, LOCATION_CHANGE
    
    # Snapshot of state
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=True)
    
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tool = relationship("Tool", back_populates="history")
    changed_by_user = relationship("User", foreign_keys=[changed_by])
