import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import date

from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.vehicle import Vehicle, VehicleStatus, MaintenanceType, DocumentType
from app.core.security import create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Roles
    role_admin = Role(id=1, name="admin", level=1)
    session.add(role_admin)
    
    # Users
    admin = User(email="admin@test.com", password_hash="x", role_id=1, full_name="Admin", is_active=True)
    session.add(admin)
    session.commit()
    
    yield session
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[deps.get_db] = override_get_db
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def admin_token(db):
    user = db.query(User).filter(User.email == "admin@test.com").first()
    access_token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {access_token}"}

def test_create_vehicle(client, admin_token):
    response = client.post(
        "/vehicles/",
        json={
            "vin": "VIN1234567890",
            "license_plate": "ABC-123",
            "brand": "Toyota",
            "model": "Hilux",
            "year": 2023,
            "odometer": 15000.5,
            "status": "AVAILABLE"
        },
        headers=admin_token
    )
    assert response.status_code == 200
    data = response.json()
    assert data["vin"] == "VIN1234567890"
    assert data["brand"] == "Toyota"
    assert data["id"] is not None

def test_create_maintenance(client, admin_token, db):
    # Get vehicle
    vehicle = db.query(Vehicle).filter(Vehicle.vin == "VIN1234567890").first()
    
    response = client.post(
        f"/vehicles/{vehicle.id}/maintenances",
        json={
            "maintenance_type": "PREVENTIVE",
            "date": str(date.today()),
            "provider": "Toyota Service",
            "cost": 5000.0,
            "odometer": 15500.0,
            "description": "Oil change"
        },
        headers=admin_token
    )
    assert response.status_code == 200
    data = response.json()
    assert data["vehicle_id"] == vehicle.id
    assert data["maintenance_type"] == "PREVENTIVE"

def test_document_validation_flow(client, admin_token, db):
    # Get vehicle
    vehicle = db.query(Vehicle).filter(Vehicle.vin == "VIN1234567890").first()
    
    # 1. Create Document (unverified)
    response = client.post(
        f"/vehicles/{vehicle.id}/documents",
        json={
            "document_type": "INSURANCE",
            "expiration_date": "2024-12-31"
        },
        headers=admin_token
    )
    assert response.status_code == 200
    doc_data = response.json()
    doc_id = doc_data["id"]
    assert doc_data["verified"] is False
    
    # 2. Try to validate without evidence -> Fail
    response = client.post(
        f"/vehicles/documents/{doc_id}/validate",
        json={
            "verified": True
            # evidence_id omitted
        },
        headers=admin_token
    )
    assert response.status_code == 400
    assert "Evidence is required" in response.json()["detail"]
    
    # 3. Validate with evidence -> Success
    evidence_id = "EV-12345"
    response = client.post(
        f"/vehicles/documents/{doc_id}/validate",
        json={
            "verified": True,
            "evidence_id": evidence_id
        },
        headers=admin_token
    )
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is True
    assert data["evidence_id"] == evidence_id
    assert data["verified_by"] is not None

