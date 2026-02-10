import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone

from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit
from app.models.warehouse import Warehouse
from app.models.location_models import StorageLocation, LocationType
from app.models.product_location_models import ProductLocationAssignment, AssignmentType
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
    role = Role(name="admin", description="Administrator", level=1)
    db.add(role)
    db.commit()
    
    user = User(
        email="admin@locreports.com", 
        password_hash="hash", 
        full_name="Admin Reports", 
        role_id=role.id, 
        is_active=True
    )
    db.add(user)
    db.commit()
    return create_access_token(subject=str(user.id))

@pytest.fixture(scope="module")
def setup_locations(db):
    # Category & Unit
    cat = Category(name="Parts", description="Parts")
    unit = Unit(name="Item", abbreviation="itm")
    db.add_all([cat, unit])
    db.commit()

    # Warehouse
    wh = Warehouse(code="WH-LOC", name="Loc Warehouse", created_by=1)
    db.add(wh)
    db.commit()

    # Locations
    # Loc 1: Shelf, Capacity 100, Occupied 50
    loc1 = StorageLocation(
        warehouse_id=wh.id,
        code="A-01",
        name="Shelf A1",
        location_type=LocationType.SHELF,
        capacity=100,
        current_occupancy=50
    )
    # Loc 2: Bin, Capacity 50, Occupied 0 (Empty but has capacity)
    loc2 = StorageLocation(
        warehouse_id=wh.id,
        code="B-01",
        name="Bin B1",
        location_type=LocationType.BIN,
        capacity=50,
        current_occupancy=0
    )
    # Loc 3: Floor, Capacity 0 (Unlimited/Undefined), Occupied 0
    loc3 = StorageLocation(
        warehouse_id=wh.id,
        code="F-01",
        name="Floor Area",
        location_type=LocationType.FLOOR,
        capacity=0,
        current_occupancy=0
    )
    db.add_all([loc1, loc2, loc3])
    db.commit()

    # Product
    p1 = Product(sku="P1", name="Product 1", category_id=cat.id, unit_id=unit.id, cost=10, price=20)
    db.add(p1)
    db.commit()

    # Assignments
    # P1 in Loc 1
    assign1 = ProductLocationAssignment(
        product_id=p1.id,
        location_id=loc1.id,
        warehouse_id=wh.id,
        quantity=50,
        assignment_type=AssignmentType.MANUAL,
        assigned_by=1
    )
    db.add(assign1)
    db.commit()
    
    return {"wh_id": wh.id, "loc1_id": loc1.id, "loc2_id": loc2.id, "p1_id": p1.id}

def test_inventory_by_location(client, token, setup_locations):
    response = client.get(
        "/reports/inventory/by-location",
        headers={"Authorization": f"Bearer {token}"},
        params={"warehouse_id": setup_locations["wh_id"]}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["location_code"] == "A-01"
    assert data[0]["quantity"] == 50
    assert data[0]["sku"] == "P1"

def test_location_utilization(client, token, setup_locations):
    response = client.get(
        "/reports/location-utilization",
        headers={"Authorization": f"Bearer {token}"},
        params={"warehouse_id": setup_locations["wh_id"]}
    )
    assert response.status_code == 200
    data = response.json()
    # Should return Loc 1 (50%) and Loc 2 (0%). Loc 3 has capacity 0 so excluded.
    assert len(data) == 2
    
    loc1_data = next(d for d in data if d["code"] == "A-01")
    assert loc1_data["utilization_percent"] == 50.0
    
    loc2_data = next(d for d in data if d["code"] == "B-01")
    assert loc2_data["utilization_percent"] == 0.0

def test_empty_locations(client, token, setup_locations):
    response = client.get(
        "/reports/empty-locations",
        headers={"Authorization": f"Bearer {token}"},
        params={"warehouse_id": setup_locations["wh_id"]}
    )
    assert response.status_code == 200
    data = response.json()
    # Loc 2 is empty. Loc 3 is empty. Loc 1 is occupied.
    # So should return Loc 2 and Loc 3.
    codes = [d["code"] for d in data]
    assert "B-01" in codes
    assert "F-01" in codes
    assert "A-01" not in codes
