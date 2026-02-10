import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import date, timedelta
from unittest.mock import patch, AsyncMock
from decimal import Decimal

from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.vehicle_maintenance import (
    VehicleMaintenanceType, 
    VehicleMaintenanceRecord, 
    VehicleMaintenancePart,
    MaintenanceCategory,
    MaintenanceStatus
)
from app.models.inventory_refs import Category, Unit
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.movement import MovementRequest, MovementType
from app.core.security import create_access_token

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Roles
    role_admin = Role(id=1, name="admin", level=1)
    role_operator = Role(id=4, name="operator", level=4)
    session.add(role_admin)
    session.add(role_operator)
    
    # Users
    admin = User(email="admin@test.com", password_hash="x", role_id=1, full_name="Admin", is_active=True)
    operator = User(email="operator@test.com", password_hash="x", role_id=4, full_name="Operator", is_active=True)
    session.add(admin)
    session.add(operator)
    session.commit()
    
    yield session
    
    session.close()
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
    del app.dependency_overrides[deps.get_db]

@pytest.fixture(scope="module")
def admin_token(db):
    user = db.query(User).filter(User.email == "admin@test.com").first()
    return create_access_token(subject=user.id)

@pytest.fixture(scope="module")
def operator_token(db):
    user = db.query(User).filter(User.email == "operator@test.com").first()
    return create_access_token(subject=user.id)

def test_create_maintenance_type(client, admin_token):
    response = client.post(
        "/vehicles/maintenance/types",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Oil Change",
            "code": "OIL-CHG",
            "category": "preventivo",
            "recommended_interval_months": 6,
            "recommended_interval_km": 10000,
            "description": "Standard oil change"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Oil Change"
    assert data["category"] == "preventivo"
    assert data["id"] is not None

def test_create_maintenance_record(client, db, admin_token):
    # Setup: Create Vehicle and Maintenance Type
    # Vehicle
    vehicle = Vehicle(
        brand="Toyota",
        model="Hilux",
        year=2022,
        license_plate="ABC-123",
        vin="1234567890",
        status=VehicleStatus.AVAILABLE
    )
    db.add(vehicle)
    
    # Maintenance Type (already created in previous test, but let's ensure we have one)
    m_type = db.query(VehicleMaintenanceType).first()
    if not m_type:
        m_type = VehicleMaintenanceType(
            name="Tires", code="TIRES", category=MaintenanceCategory.PREVENTIVE, recommended_interval_months=12
        )
        db.add(m_type)
    
    db.commit()
    
    # Test Create Record
    response = client.post(
        "/vehicles/maintenance/records",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "vehicle_id": vehicle.id,
            "maintenance_type_id": m_type.id,
            "service_date": str(date.today()),
            "odometer_at_service": 50000,
            "cost_amount": 1500.00,
            "provider_name": "Tire Shop",
            "description": "Changed 4 tires"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["vehicle_id"] == vehicle.id
    assert data["status"] == MaintenanceStatus.SCHEDULED.value # Default status
    
    # Verify next recommended date/odometer logic
    # m_type has interval_months=6 (from previous test) or 12
    # If it's the one from previous test (Oil Change), it has 6 months and 10000km
    
    if m_type.name == "Oil Change":
        expected_next_odo = 50000 + 10000
        assert data["next_recommended_odometer"] == expected_next_odo

def test_get_maintenance_history(client, admin_token, db):
    vehicle = db.query(Vehicle).first()
    response = client.get(
        f"/vehicles/maintenance/records/{vehicle.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["vehicle_id"] == vehicle.id

def test_upcoming_maintenance(client, admin_token):
    response = client.get(
        "/vehicles/maintenance/upcoming",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_complete_maintenance_stock_deduction(client, db, admin_token):
    # 1. Setup Data
    # Warehouse
    warehouse = Warehouse(code="WH-TEST", name="Test Warehouse", created_by=1)
    db.add(warehouse)
    
    # Category & Unit
    category = Category(name="Parts")
    unit = Unit(name="Piece", abbreviation="pc")
    db.add(category)
    db.add(unit)
    db.commit() # to get IDs
    
    # Product
    product = Product(
        sku="PART-001", 
        name="Oil Filter", 
        category_id=category.id, 
        unit_id=unit.id,
        cost=10.0
    )
    db.add(product)
    
    # Vehicle & Type (reuse or create)
    vehicle = db.query(Vehicle).first()
    if not vehicle:
         vehicle = Vehicle(brand="Test", model="Car", year=2020, license_plate="TEST-001", status=VehicleStatus.AVAILABLE)
         db.add(vehicle)
         
    m_type = db.query(VehicleMaintenanceType).first()
    if not m_type:
        m_type = VehicleMaintenanceType(name="General", code="GEN", category=MaintenanceCategory.PREVENTIVE)
        db.add(m_type)
        
    db.commit()
    
    # 2. Create Maintenance Record
    record = VehicleMaintenanceRecord(
        vehicle_id=vehicle.id,
        maintenance_type_id=m_type.id,
        service_date=date.today(),
        status=MaintenanceStatus.SCHEDULED,
        cost_amount=100.0,
        provider_name="Test Provider"
    )
    db.add(record)
    db.commit()
    
    # 3. Add Part linked to Product & Warehouse
    part = VehicleMaintenancePart(
        maintenance_id=record.id,
        part_name="Oil Filter",
        product_id=product.id,
        warehouse_id=warehouse.id,
        quantity=2,
        unit_cost=10.0,
        total_cost=20.0
    )
    db.add(part)
    db.commit()
    
    # 4. Mock StockService
    with patch("app.services.vehicle_maintenance_service.StockService.apply_movement", new_callable=AsyncMock) as mock_apply:
        # 5. Call Complete Endpoint
        response = client.post(
            f"/vehicles/maintenance/record/{record.id}/complete",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # 6. Verify
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == MaintenanceStatus.COMPLETED.value
        
        # Verify Mock called
        mock_apply.assert_called_once()
        
        # Verify MovementRequest created in DB
        movement = db.query(MovementRequest).filter(MovementRequest.reason.like("%Maintenance%")).first()
        assert movement is not None
        assert movement.source_warehouse_id == warehouse.id
        assert movement.type == MovementType.OUT
        
        # Verify call args
        call_args = mock_apply.call_args
        # args: (db, movement_id, user_id)
        assert call_args[0][1] == movement.id
