import enum
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.user import Base

class IntegratedRequestPurpose(str, enum.Enum):
    PROYECTO = 'proyecto'
    MANTENIMIENTO = 'mantenimiento'
    OBRA = 'obra'
    EMERGENCIA = 'emergencia'
    OTRO = 'otro'

class IntegratedRequestStatus(str, enum.Enum):
    BORRADOR = 'borrador'
    PENDIENTE = 'pendiente'
    APROBADA = 'aprobada'
    RECHAZADA = 'rechazada'
    ENTREGADA = 'entregada'
    PARCIAL_DEVUELTA = 'parcial_devuelta'
    COMPLETADA = 'completada'

class EmergencyLevel(str, enum.Enum):
    NORMAL = 'normal'
    URGENTE = 'urgente'
    CRITICA = 'critica'

class IntegratedRequest(Base):
    __tablename__ = "integrated_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(20), unique=True, index=True, nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    purpose = Column(Enum(IntegratedRequestPurpose), nullable=False)
    project_code = Column(String(50), nullable=True)
    expected_return_date = Column(Date, nullable=True)
    status = Column(Enum(IntegratedRequestStatus), default=IntegratedRequestStatus.BORRADOR, nullable=False)
    
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    delivered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    
    notes = Column(Text, nullable=True)
    emergency_level = Column(Enum(EmergencyLevel), default=EmergencyLevel.NORMAL, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    requester = relationship("User", foreign_keys=[requested_by], backref="integrated_requests")
    approver = relationship("User", foreign_keys=[approved_by])
    deliverer = relationship("User", foreign_keys=[delivered_by])
    
    items = relationship("RequestItem", back_populates="request", cascade="all, delete-orphan")
    tools = relationship("RequestTool", back_populates="request", cascade="all, delete-orphan")
    epp_items = relationship("RequestEPP", back_populates="request", cascade="all, delete-orphan")
    vehicles = relationship("RequestVehicle", back_populates="request", cascade="all, delete-orphan")
    tracking = relationship("RequestTracking", back_populates="request", cascade="all, delete-orphan")


class RequestItemStatus(str, enum.Enum):
    PENDIENTE = 'pendiente'
    APROBADO = 'aprobado'
    ENTREGADO = 'entregado'
    EN_DEVOLUCION = 'en_devolucion'
    DEVUELTO_PARCIAL = 'devuelto_parcial'
    CONSUMIDO = 'consumido'

class RequestItem(Base):
    __tablename__ = "request_items"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("integrated_requests.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("product_batches.id"), nullable=True)
    
    quantity_requested = Column(Integer, nullable=False)
    quantity_approved = Column(Integer, default=0)
    quantity_delivered = Column(Integer, default=0)
    quantity_returned = Column(Integer, default=0)
    
    purpose = Column(String(500), nullable=True)
    status = Column(Enum(RequestItemStatus), default=RequestItemStatus.PENDIENTE)
    notes = Column(Text, nullable=True)

    # Relationships
    request = relationship("IntegratedRequest", back_populates="items")
    product = relationship("Product")
    batch = relationship("ProductBatch")


class RequestToolStatus(str, enum.Enum):
    PENDIENTE = 'pendiente'
    PRESTADA = 'prestada'
    EN_DEVOLUCION = 'en_devolucion'
    DEVUELTA = 'devuelta'
    DANADA = 'danada'
    PERDIDA = 'perdida'

class RequestTool(Base):
    __tablename__ = "request_tools"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("integrated_requests.id"), nullable=False)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    expected_return_date = Column(Date, nullable=True)
    condition_out = Column(String(50), nullable=True)
    condition_in = Column(String(50), nullable=True)
    
    checked_out_at = Column(DateTime, nullable=True)
    checked_in_at = Column(DateTime, nullable=True)
    
    status = Column(Enum(RequestToolStatus), default=RequestToolStatus.PENDIENTE)
    damage_notes = Column(Text, nullable=True)
    penalty_applied = Column(Boolean, default=False)

    # Relationships
    request = relationship("IntegratedRequest", back_populates="tools")
    tool = relationship("Tool")
    assignee = relationship("User", foreign_keys=[assigned_to])


class RequestEPPStatus(str, enum.Enum):
    PENDIENTE = 'pendiente'
    ASIGNADO = 'asignado'
    EN_DEVOLUCION = 'en_devolucion'
    DEVUELTO = 'devuelto'
    CADUCADO = 'caducado'
    DANADO = 'danado'

class RequestEPP(Base):
    __tablename__ = "request_epp"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("integrated_requests.id"), nullable=False)
    epp_id = Column(Integer, ForeignKey("epp.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    expected_return_date = Column(Date, nullable=True)
    checkout_date = Column(DateTime, nullable=True)
    checkin_date = Column(DateTime, nullable=True)
    
    condition_out = Column(String(50), nullable=True)
    condition_in = Column(String(50), nullable=True)
    
    status = Column(Enum(RequestEPPStatus), default=RequestEPPStatus.PENDIENTE)
    inspection_notes = Column(Text, nullable=True)

    # Relationships
    request = relationship("IntegratedRequest", back_populates="epp_items")
    epp = relationship("EPP")
    assignee = relationship("User", foreign_keys=[assigned_to])


class FuelLevel(str, enum.Enum):
    LEVEL_0_25 = '0-25%'
    LEVEL_25_50 = '25-50%'
    LEVEL_50_75 = '50-75%'
    LEVEL_75_100 = '75-100%'

class RequestVehicleStatus(str, enum.Enum):
    PENDIENTE = 'pendiente'
    ASIGNADO = 'asignado'
    EN_USO = 'en_uso'
    EN_DEVOLUCION = 'en_devolucion'
    DEVUELTO = 'devuelto'
    CON_INCIDENTE = 'con_incidente'

class RequestVehicle(Base):
    __tablename__ = "request_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("integrated_requests.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    odometer_out = Column(Integer, nullable=True)
    odometer_in = Column(Integer, nullable=True)
    
    fuel_level_out = Column(Enum(FuelLevel), nullable=True)
    fuel_level_in = Column(Enum(FuelLevel), nullable=True)
    
    checkout_date = Column(DateTime, nullable=True)
    checkin_date = Column(DateTime, nullable=True)
    
    status = Column(Enum(RequestVehicleStatus), default=RequestVehicleStatus.PENDIENTE)
    incident_report = Column(Text, nullable=True)
    return_notes = Column(Text, nullable=True)

    # Relationships
    request = relationship("IntegratedRequest", back_populates="vehicles")
    vehicle = relationship("Vehicle")
    assignee = relationship("User", foreign_keys=[assigned_to])


class RequestTrackingItemType(str, enum.Enum):
    PRODUCTO = 'producto'
    HERRAMIENTA = 'herramienta'
    EPP = 'epp'
    VEHICULO = 'vehiculo'

class RequestTrackingAction(str, enum.Enum):
    SOLICITADO = 'solicitado'
    APROBADO = 'aprobado'
    ENTREGADO = 'entregado'
    RECORDATORIO = 'recordatorio'
    VENCIDO = 'vencido'
    DEVUELTO = 'devuelto'

class RequestTracking(Base):
    __tablename__ = "request_tracking"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("integrated_requests.id"), nullable=False)
    item_type = Column(Enum(RequestTrackingItemType), nullable=False)
    item_id = Column(Integer, nullable=False) # Generic ID ref
    action = Column(Enum(RequestTrackingAction), nullable=False)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    request = relationship("IntegratedRequest", back_populates="tracking")
    performer = relationship("User", foreign_keys=[performed_by])
