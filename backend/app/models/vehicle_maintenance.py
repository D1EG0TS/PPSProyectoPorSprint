from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, Numeric, ForeignKey, Enum, TIMESTAMP
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class MaintenanceCategory(str, enum.Enum):
    PREVENTIVE = 'preventivo'
    CORRECTIVE = 'correctivo'
    PREDICTIVE = 'predictivo'

class MaintenanceStatus(str, enum.Enum):
    SCHEDULED = 'programado'
    IN_PROGRESS = 'en_progreso'
    COMPLETED = 'completado'
    CANCELLED = 'cancelado'

class MaintenancePriority(str, enum.Enum):
    LOW = 'baja'
    MEDIUM = 'media'
    HIGH = 'alta'
    CRITICAL = 'critica'

class VehicleMaintenanceType(Base):
    __tablename__ = "vehicle_maintenance_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(MaintenanceCategory), nullable=False)
    recommended_interval_km = Column(Integer, nullable=True)
    recommended_interval_months = Column(Integer, nullable=True)
    estimated_duration_hours = Column(Numeric(5, 2), nullable=True)
    is_active = Column(Boolean, default=True)

    records = relationship("VehicleMaintenanceRecord", back_populates="maintenance_type")

class VehicleMaintenanceRecord(Base):
    __tablename__ = "vehicle_maintenance_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    maintenance_type_id = Column(Integer, ForeignKey("vehicle_maintenance_types.id"), nullable=False)
    odometer_at_service = Column(Integer, nullable=True)
    service_date = Column(Date, nullable=False)
    next_recommended_date = Column(Date, nullable=True)
    next_recommended_odometer = Column(Integer, nullable=True)
    cost_amount = Column(Numeric(10, 2), nullable=True)
    cost_currency = Column(String(3), default='MXN')
    provider_name = Column(String(200), nullable=True)
    provider_contact = Column(String(500), nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(MaintenanceStatus), default=MaintenanceStatus.SCHEDULED)
    priority = Column(Enum(MaintenancePriority), default=MaintenancePriority.MEDIUM)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    requires_followup = Column(Boolean, default=False)
    followup_date = Column(Date, nullable=True)
    created_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    # Relationships
    vehicle = relationship("Vehicle", backref="maintenance_records") # Using backref to avoid modifying Vehicle class directly if possible
    maintenance_type = relationship("VehicleMaintenanceType", back_populates="records")
    performed_by_user = relationship("User", foreign_keys=[performed_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    attachments = relationship("VehicleMaintenanceAttachment", back_populates="maintenance_record", cascade="all, delete-orphan")
    parts = relationship("VehicleMaintenancePart", back_populates="maintenance_record", cascade="all, delete-orphan")

class VehicleMaintenanceAttachment(Base):
    __tablename__ = "vehicle_maintenance_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    maintenance_id = Column(Integer, ForeignKey("vehicle_maintenance_records.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(1000), nullable=False)
    file_type = Column(String(50), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    description = Column(String(500), nullable=True)

    maintenance_record = relationship("VehicleMaintenanceRecord", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploaded_by])

class VehicleMaintenancePart(Base):
    __tablename__ = "vehicle_maintenance_parts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    maintenance_id = Column(Integer, ForeignKey("vehicle_maintenance_records.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    part_name = Column(String(200), nullable=False)
    part_number = Column(String(100), nullable=True)
    quantity = Column(Numeric(10, 3), nullable=False)
    unit = Column(String(20), nullable=True)
    unit_cost = Column(Numeric(10, 2), nullable=True)
    total_cost = Column(Numeric(10, 2), nullable=True)
    supplier = Column(String(200), nullable=True)
    warranty_months = Column(Integer, nullable=True)

    maintenance_record = relationship("VehicleMaintenanceRecord", back_populates="parts")
