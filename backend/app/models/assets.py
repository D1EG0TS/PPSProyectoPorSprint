import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

# Enums
class AssetType(str, enum.Enum):
    HERRAMIENTA = 'herramienta'
    EQUIPO_MEDICION = 'equipo_medicion'
    ACTIVO_INFORMATICO = 'activo_informatico'

class DepreciationMethod(str, enum.Enum):
    LINEAL = 'lineal'
    ACELERADA = 'acelerada'
    NONE = 'none'

class AssetStatus(str, enum.Enum):
    DISPONIBLE = 'disponible'
    ASIGNADO = 'asignado'
    EN_MANTENIMIENTO = 'en_mantenimiento'
    EN_REPARACION = 'en_reparacion'
    EN_CALIBRACION = 'en_calibracion'
    BAJA = 'baja'
    EXTRAVIADO = 'extraviado'

class AssetCondition(str, enum.Enum):
    NUEVO = 'nuevo'
    EXCELENTE = 'excelente'
    BUENO = 'bueno'
    REGULAR = 'regular'
    MALO = 'malo'
    NO_OPERATIVO = 'no_operativo'

class AttributeType(str, enum.Enum):
    TEXTO = 'texto'
    NUMERO = 'numero'
    BOOLEANO = 'booleano'
    FECHA = 'fecha'

class MaintenanceType(str, enum.Enum):
    PREVENTIVO = 'preventivo'
    CORRECTIVO = 'correctivo'
    PREDICTIVO = 'predictivo'

class MaintenanceStatus(str, enum.Enum):
    PROGRAMADO = 'programado'
    EN_PROCESO = 'en_proceso'
    COMPLETADO = 'completado'
    CANCELADO = 'cancelado'

class CalibrationStatus(str, enum.Enum):
    VIGENTE = 'vigente'
    PROXIMO_A_VENCER = 'proximo_a_vencer'
    VENCIDO = 'vencido'
    EN_PROCESO = 'en_proceso'

class AssetAction(str, enum.Enum):
    CREADO = 'creado'
    ASIGNADO = 'asignado'
    DEVUELTO = 'devuelto'
    MANTENIMIENTO = 'mantenimiento'
    CALIBRADO = 'calibrado'
    BAJA = 'baja'
    UBICACION_CAMBIADA = 'ubicacion_cambiada'
    VALOR_ACTUALIZADO = 'valor_actualizado'

class AssignmentStatus(str, enum.Enum):
    ACTIVA = 'activa'
    DEVUELTA = 'devuelta'
    VENCIDA = 'vencida'

# Models
class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    asset_type = Column(Enum(AssetType), nullable=False)
    requires_calibration = Column(Boolean, default=False)
    requires_maintenance = Column(Boolean, default=False)
    depreciable = Column(Boolean, default=False)
    useful_life_months = Column(Integer, nullable=True)
    depreciation_method = Column(Enum(DepreciationMethod), default=DepreciationMethod.NONE)

    assets = relationship("Asset", back_populates="category")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_tag = Column(String(50), unique=True, index=True, nullable=False)
    category_id = Column(Integer, ForeignKey("asset_categories.id"), nullable=False)
    name = Column(String(200), nullable=False)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    serial_number = Column(String(100), unique=True, nullable=True)
    barcode = Column(String(100), nullable=True)
    acquisition_date = Column(Date, nullable=True)
    acquisition_cost = Column(Numeric(10, 2), nullable=True)
    current_value = Column(Numeric(10, 2), nullable=True)
    supplier = Column(String(200), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    warranty_expiration = Column(Date, nullable=True)
    
    location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    responsible_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    status = Column(Enum(AssetStatus), default=AssetStatus.DISPONIBLE, nullable=False)
    condition = Column(Enum(AssetCondition), default=AssetCondition.NUEVO, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    # Relationships
    category = relationship("AssetCategory", back_populates="assets")
    location = relationship("StorageLocation", backref="assets")
    warehouse = relationship("Warehouse", backref="assets")
    responsible_user = relationship("User", foreign_keys=[responsible_user_id], backref="responsible_for_assets")
    
    attributes = relationship("AssetAttribute", back_populates="asset", cascade="all, delete-orphan")
    depreciation_history = relationship("AssetDepreciation", back_populates="asset", cascade="all, delete-orphan")
    maintenance_records = relationship("AssetMaintenance", back_populates="asset", cascade="all, delete-orphan")
    calibration_records = relationship("AssetCalibration", back_populates="asset", cascade="all, delete-orphan")
    assignments = relationship("AssetAssignment", back_populates="asset", cascade="all, delete-orphan")
    audit_logs = relationship("AssetAuditLog", back_populates="asset", cascade="all, delete-orphan")

class AssetAttribute(Base):
    __tablename__ = "asset_attributes"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    attribute_name = Column(String(100), nullable=False)
    attribute_value = Column(Text, nullable=True)
    attribute_type = Column(Enum(AttributeType), default=AttributeType.TEXTO)

    asset = relationship("Asset", back_populates="attributes")

class AssetDepreciation(Base):
    __tablename__ = "asset_depreciation"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    depreciation_date = Column(Date, nullable=False)
    previous_value = Column(Numeric(10, 2), nullable=False)
    depreciation_amount = Column(Numeric(10, 2), nullable=False)
    new_value = Column(Numeric(10, 2), nullable=False)
    method = Column(String(50), nullable=True)
    calculated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    asset = relationship("Asset", back_populates="depreciation_history")
    calculator = relationship("User", backref="depreciation_calculations")

class AssetMaintenance(Base):
    __tablename__ = "asset_maintenance"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    maintenance_type = Column(Enum(MaintenanceType), nullable=False)
    service_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    technician = Column(String(200), nullable=True)
    cost = Column(Numeric(10, 2), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    next_maintenance_date = Column(Date, nullable=True)
    status = Column(Enum(MaintenanceStatus), default=MaintenanceStatus.PROGRAMADO, nullable=False)
    
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    notes = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=True)

    asset = relationship("Asset", back_populates="maintenance_records")
    performer = relationship("User", foreign_keys=[performed_by], backref="performed_maintenances")
    approver = relationship("User", foreign_keys=[approved_by], backref="approved_maintenances")

class AssetCalibration(Base):
    __tablename__ = "asset_calibration"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    calibration_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    certificate_number = Column(String(100), nullable=True)
    certificate_file = Column(String(500), nullable=True)
    calibration_lab = Column(String(200), nullable=True)
    standard_used = Column(String(200), nullable=True)
    results = Column(JSON, nullable=True)
    deviation = Column(Numeric(10, 6), nullable=True)
    tolerance = Column(Numeric(10, 6), nullable=True)
    passed = Column(Boolean, default=True)
    adjusted = Column(Boolean, default=False)
    cost = Column(Numeric(10, 2), nullable=True)
    
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    certificate_url = Column(String(500), nullable=True)
    next_calibration_date = Column(Date, nullable=True)
    status = Column(Enum(CalibrationStatus), default=CalibrationStatus.VIGENTE)

    asset = relationship("Asset", back_populates="calibration_records")
    performer = relationship("User", backref="performed_calibrations")

class AssetAssignment(Base):
    __tablename__ = "asset_assignments"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assignment_date = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    expected_return_date = Column(Date, nullable=True)
    return_date = Column(DateTime, nullable=True)
    condition_out = Column(String(50), nullable=True)
    condition_in = Column(String(50), nullable=True)
    purpose = Column(Text, nullable=True)
    request_id = Column(Integer, ForeignKey("integrated_requests.id"), nullable=True)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.ACTIVA)

    asset = relationship("Asset", back_populates="assignments")
    assignee = relationship("User", foreign_keys=[assigned_to], backref="asset_assignments_received")
    assigner = relationship("User", foreign_keys=[assigned_by], backref="asset_assignments_given")
    request = relationship("IntegratedRequest", backref="asset_assignments")

class AssetAuditLog(Base):
    __tablename__ = "asset_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    action = Column(Enum(AssetAction), nullable=False)
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    ip_address = Column(String(45), nullable=True)

    asset = relationship("Asset", back_populates="audit_logs")
    user = relationship("User", backref="asset_audits")
