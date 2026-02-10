from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint, JSON, Enum
from sqlalchemy.orm import relationship
from app.models.user import Base
import enum

class LocationType(str, enum.Enum):
    ZONE = "zone"
    AISLE = "aisle"
    RACK = "rack"
    SHELF = "shelf"  # Fila/Nivel
    BIN = "bin"      # Columna/Posición
    PALLET = "pallet"
    FLOOR = "floor"

class StorageLocation(Base):
    __tablename__ = "storage_locations"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    parent_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    
    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    path = Column(String(255), nullable=True)  # Materialized path e.g. /A/B/C
    
    # Coordinate fields for easier addressing
    aisle = Column(String(50), nullable=True)
    rack = Column(String(50), nullable=True)
    shelf = Column(String(50), nullable=True)
    position = Column(String(50), nullable=True)
    
    # New fields
    location_type = Column(Enum(LocationType, values_callable=lambda x: [e.value for e in x]), default=LocationType.SHELF, nullable=False)
    capacity = Column(Integer, default=0) # Capacidad máxima en unidades
    dimensions = Column(JSON, nullable=True) # { "length": 0, "width": 0, "height": 0, "unit": "cm" }
    temperature_zone = Column(String(50), nullable=True)
    is_restricted = Column(Boolean, default=False)
    current_occupancy = Column(Integer, default=0)
    barcode = Column(String(100), unique=True, index=True, nullable=True)

    # Relationships
    warehouse = relationship("Warehouse", back_populates="locations")
    parent = relationship("StorageLocation", remote_side=[id], backref="children")
    
    # Assignments
    product_assignments = relationship("ProductLocationAssignment", back_populates="location")

    __table_args__ = (
        UniqueConstraint('warehouse_id', 'code', name='uix_warehouse_location_code'),
    )
