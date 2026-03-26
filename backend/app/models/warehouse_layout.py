from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class CellType(str, enum.Enum):
    ZONE = "zone"
    AISLE = "aisle"
    RACK = "rack"
    SHELF = "shelf"
    STORAGE = "storage"
    RECEIVING = "receiving"
    SHIPPING = "shipping"
    STAGING = "staging"
    EMPTY = "empty"


class OccupancyLevel(str, enum.Enum):
    EMPTY = "empty"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    FULL = "full"


class WarehouseLayout(Base):
    __tablename__ = "warehouse_layouts"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), unique=True, nullable=False)
    
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    
    grid_rows = Column(Integer, nullable=False, default=10)
    grid_cols = Column(Integer, nullable=False, default=10)
    cell_width = Column(Float, nullable=False, default=100)
    cell_height = Column(Float, nullable=False, default=100)
    
    is_active = Column(Boolean, default=True)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(Integer, nullable=False)
    updated_at = Column(Integer, nullable=True)

    warehouse = relationship("Warehouse", backref="layout")
    creator = relationship("User", foreign_keys=[created_by], backref="created_layouts")
    updater = relationship("User", foreign_keys=[updated_by], backref="updated_layouts")
    cells = relationship("LayoutCell", back_populates="layout", cascade="all, delete-orphan")


class LayoutCell(Base):
    __tablename__ = "layout_cells"

    id = Column(Integer, primary_key=True, index=True)
    layout_id = Column(Integer, ForeignKey("warehouse_layouts.id"), nullable=False)
    
    row = Column(Integer, nullable=False)
    col = Column(Integer, nullable=False)
    
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    
    cell_type = Column(SQLEnum(CellType, values_callable=lambda x: [e.value for e in x]), default=CellType.EMPTY, nullable=False)
    name = Column(String(100), nullable=True)
    color = Column(String(20), nullable=True)
    
    occupancy_level = Column(SQLEnum(OccupancyLevel, values_callable=lambda x: [e.value for e in x]), default=OccupancyLevel.EMPTY, nullable=False)
    occupancy_percentage = Column(Float, default=0)
    
    linked_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    linked_aisle = Column(String(50), nullable=True)
    linked_rack = Column(String(50), nullable=True)
    linked_shelf = Column(String(50), nullable=True)
    
    metadata = Column(JSON, nullable=True)
    
    created_at = Column(Integer, nullable=False)
    updated_at = Column(Integer, nullable=True)

    layout = relationship("WarehouseLayout", back_populates="cells")
    linked_location = relationship("StorageLocation")
