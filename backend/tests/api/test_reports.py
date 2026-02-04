import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta, timezone

from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit
from app.models.movement import Movement, MovementType
from app.models.vehicle import Vehicle, VehicleDocument, VehicleStatus, DocumentType
from app.models.epp import EPP, EPPStatus
from app.models.warehouse import Warehouse
from app.core.security import create_access_token

# Setup in-memory DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
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
    yield TestClient(app)
    del app.dependency_overrides[deps.get_db]

@pytest.fixture(scope="module")
def token(db):
    # Create Admin Role
    role = Role(name="admin", description="Administrator", level=1)
    db.add(role)
    db.commit()
    
    # Create Admin User
    user = User(
        email="admin@reports.com", 
        password_hash="hash", 
        full_name="Admin Reports", 
        role_id=role.id, 
        is_active=True
    )
    db.add(user)
    db.commit()
    
    return create_access_token(subject=str(user.id))

@pytest.fixture(scope="module")
def setup_data(db):
    # Create Categories & Units
    cat1 = Category(name="Electronics", description="Electronic Goods")
    unit1 = Unit(name="Piece", abbreviation="pc")
    db.add_all([cat1, unit1])
    db.commit()
    
    # Create Warehouse
    wh = Warehouse(code="WH-MAIN", name="Main Warehouse", created_by=1)
    db.add(wh)
    db.commit()
    
    # Create Product P1 (Cost 100)
    p1 = Product(
        sku="PROD-1", name="Product 1", category_id=cat1.id, unit_id=unit1.id,
        cost=100.0, price=150.0, has_batch=False
    )
    db.add(p1)
    db.commit()
    
    # Create Movements
    # IN: 100 units of P1 (Stock = 100, Value = 10000)
    m1 = Movement(
        type=MovementType.IN,
        product_id=p1.id,
        warehouse_id=wh.id,
        quantity=100,
        previous_balance=0,
        new_balance=100,
        created_at=datetime.now(timezone.utc) - timedelta(days=5)
    )
    # OUT: 10 units of P1 (Stock = 90, Value = 9000)
    m2 = Movement(
        type=MovementType.OUT,
        product_id=p1.id,
        warehouse_id=wh.id,
        quantity=-10,
        previous_balance=100,
        new_balance=90,
        created_at=datetime.now(timezone.utc) - timedelta(days=2)
    )
    db.add_all([m1, m2])
    db.commit()
    
    # Create Vehicles
    v1 = Vehicle(
        vin="VIN123", license_plate="PLATE1", brand="Toyota", model="Corolla", year=2020,
        status=VehicleStatus.AVAILABLE
    )
    v2 = Vehicle(
        vin="VIN456", license_plate="PLATE2", brand="Honda", model="Civic", year=2021,
        status=VehicleStatus.AVAILABLE
    )
    db.add_all([v1, v2])
    db.commit()
    
    # Create Vehicle Documents
    # V1: Expired Insurance
    doc1 = VehicleDocument(
        vehicle_id=v1.id,
        document_type=DocumentType.INSURANCE,
        expiration_date=datetime.now(timezone.utc).date() - timedelta(days=10), # Expired
        verified=True
    )
    # V2: Valid Insurance
    doc2 = VehicleDocument(
        vehicle_id=v2.id,
        document_type=DocumentType.INSURANCE,
        expiration_date=datetime.now(timezone.utc).date() + timedelta(days=100), # Valid
        verified=True
    )
    db.add_all([doc1, doc2])
    db.commit()
    
    # Create EPP
    epp1 = EPP(
        product_id=p1.id,
        serial_number="EPP-SN-1",
        expiration_date=datetime.now(timezone.utc).date() + timedelta(days=10), # Expires soon
        status=EPPStatus.AVAILABLE
    )
    epp2 = EPP(
        product_id=p1.id,
        serial_number="EPP-SN-2",
        expiration_date=datetime.now(timezone.utc).date() + timedelta(days=60), # Expires later
        status=EPPStatus.AVAILABLE
    )
    db.add_all([epp1, epp2])
    db.commit()
    
    return {"p1": p1}

def test_inventory_summary(client, token, setup_data):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/reports/inventory/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # Net stock = 100 - 10 = 90
    # Value = 90 * 100.0 = 9000.0
    assert data["total_items"] == 90
    assert data["total_value"] == 9000.0
    assert data["total_products"] == 1

def test_get_movements_daily(client, token, setup_data):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/reports/movements/daily?days=30", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # We expect 2 entries (one for IN 5 days ago, one for OUT 2 days ago)
    # Note: The dates are dynamic based on test execution time
    assert len(data) >= 2
    
    types = {d["type"] for d in data}
    assert "IN" in types
    assert "OUT" in types
    
    # Verify quantities are positive (absolute values)
    for entry in data:
        assert entry["total_quantity"] > 0

def test_inventory_turnover(client, token, setup_data):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/reports/inventory/turnover?period_days=30", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # Should have 1 entry for "Electronics" category
    assert len(data) == 1
    assert data[0]["category"] == "Electronics"
    # Total out is 10 (abs value)
    assert data[0]["total_out"] == 10

def test_movements_summary(client, token, setup_data):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/reports/movements/summary?period=month", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # Should have 2 entries: IN and OUT
    assert len(data) >= 2
    types = {item["type"]: item for item in data}
    assert "IN" in types
    assert "OUT" in types
    assert types["IN"]["count"] == 1
    assert types["OUT"]["count"] == 1
    assert types["OUT"]["total_quantity"] == 10

def test_vehicle_compliance(client, token, setup_data):
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/reports/vehicles/compliance", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_vehicles"] == 2
    assert data["vehicles_with_expired_docs"] == 1 # V1
    # V1 is expired, V2 is valid. Compliance rate = 50%
    assert data["compliance_rate"] == 50.0

def test_epp_expiration(client, token, setup_data):
    headers = {"Authorization": f"Bearer {token}"}
    # Check for expiration within 30 days
    response = client.get("/reports/epp/expiration?days=30", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # Should find EPP1 (10 days) but not EPP2 (60 days)
    assert len(data) == 1
    assert data[0]["serial_number"] == "EPP-SN-1"
