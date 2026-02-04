from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.user import Base

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    creator = relationship("User", backref="created_warehouses")
    locations = relationship("Location", back_populates="warehouse", cascade="all, delete-orphan")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    parent_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    path = Column(String(255), nullable=True)  # Materialized path e.g. /A/B/C

    warehouse = relationship("Warehouse", back_populates="locations")
    parent = relationship("Location", remote_side=[id], backref="children")

    __table_args__ = (
        UniqueConstraint('warehouse_id', 'code', name='uix_warehouse_code'),
    )
