import enum
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean, Text, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.user import Base

class VehicleStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    MAINTENANCE = "MAINTENANCE"
    INACTIVE = "INACTIVE"

class MaintenanceType(str, enum.Enum):
    PREVENTIVE = "PREVENTIVE"
    CORRECTIVE = "CORRECTIVE"

class DocumentType(str, enum.Enum):
    INSURANCE = "INSURANCE"
    VERIFICATION = "VERIFICATION"
    TENURE = "TENURE"
    CIRCULATION_CARD = "CIRCULATION_CARD"
    OTHER = "OTHER"

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vin = Column(String(50), unique=True, index=True, nullable=False)
    license_plate = Column(String(20), unique=True, index=True, nullable=False)
    brand = Column(String(50), nullable=False)
    model = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    odometer = Column(Float, default=0.0)
    status = Column(String(50), default=VehicleStatus.AVAILABLE)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Extra data fields (insurance/verification/tenency data) can be stored in documents or as JSON/text if simple
    # The prompt mentions "insurance/verification/tenency data" as part of the model, 
    # but also "vehicle_documents". I will treat them as linked documents or specific fields if needed.
    # Given the separate table `vehicle_documents`, I will rely on that for details, 
    # but maybe keep some summary fields if needed. 
    # The prompt list: "insurance/verification/tenency data" inside `vehicles` model.
    # I'll add them as nullable fields for quick access or policy numbers.
    insurance_policy = Column(String(100), nullable=True)
    insurance_expiration = Column(Date, nullable=True)
    
    # Relationships
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    maintenances = relationship("VehicleMaintenance", back_populates="vehicle", cascade="all, delete-orphan")
    documents = relationship("VehicleDocument", back_populates="vehicle", cascade="all, delete-orphan")

class VehicleMaintenance(Base):
    __tablename__ = "vehicle_maintenances"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    maintenance_type = Column(String(50), nullable=False) # type
    date = Column(Date, nullable=False)
    provider = Column(String(100), nullable=True)
    cost = Column(Float, nullable=True)
    odometer = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    evidence_id = Column(String(100), nullable=True)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="maintenances")

class VehicleDocument(Base):
    __tablename__ = "vehicle_documents"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    document_type = Column(String(50), nullable=False)
    expiration_date = Column(Date, nullable=True)
    verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    evidence_id = Column(String(100), nullable=True) # Mandatory for validation as per prompt

    # Relationships
    vehicle = relationship("Vehicle", back_populates="documents")
    verifier = relationship("User", foreign_keys=[verified_by])
