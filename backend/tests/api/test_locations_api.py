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
from app.models.location_audit_models import LocationAuditLog
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
    role = Role(name="admin", description="Administrator", level=100)
    db.add(role)
    db.commit()
    
    user = User(
        email="admin@locapi.com", 
        password_hash="hash", 
        full_name="Admin API", 
        role_id=role.id, 
        is_active=True
    )
    db.add(user)
    db.commit()
    return create_access_token(subject=str(user.id))

@pytest.fixture(scope="module")
def setup_basic_data(db):
    # Category & Unit
    cat = Category(name="Parts", description="Parts")
    unit = Unit(name="Item", abbreviation="itm")
    db.add_all([cat, unit])
    db.commit()

    # Warehouse
    wh = Warehouse(code="WH-API", name="API Warehouse", created_by=1)
    db.add(wh)
    db.commit()

    # Product
    p1 = Product(sku="P_LOC_1", name="Product Loc 1", category_id=cat.id, unit_id=unit.id, cost=10, price=20)
    db.add(p1)
    db.commit()
    
    return {"wh_id": wh.id, "p1_id": p1.id}

def test_create_location(client, token, setup_basic_data):
    wh_id = setup_basic_data["wh_id"]
    response = client.post(
        f"/warehouses/{wh_id}/locations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "RACK-01",
            "name": "Rack 1",
            "location_type": "rack",
            "capacity": 1000
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "RACK-01"
    assert data["warehouse_id"] == wh_id

def test_get_location(client, token, setup_basic_data):
    # Create a location first
    wh_id = setup_basic_data["wh_id"]
    loc_res = client.post(
        f"/warehouses/{wh_id}/locations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "RACK-02",
            "name": "Rack 2",
            "location_type": "rack"
        }
    )
    loc_id = loc_res.json()["id"]
    
    # Get it
    response = client.get(
        f"/locations/{loc_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["code"] == "RACK-02"

def test_update_location(client, token, setup_basic_data):
    wh_id = setup_basic_data["wh_id"]
    loc_res = client.post(
        f"/warehouses/{wh_id}/locations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "RACK-03",
            "name": "Rack 3",
            "location_type": "rack"
        }
    )
    loc_id = loc_res.json()["id"]
    
    response = client.put(
        f"/locations/{loc_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Rack 3 Updated", "capacity": 500}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Rack 3 Updated"
    assert response.json()["capacity"] == 500

def test_product_assignment_and_relocation(client, token, setup_basic_data, db):
    wh_id = setup_basic_data["wh_id"]
    p_id = setup_basic_data["p1_id"]
    
    # Create 2 locations
    loc1 = client.post(
        f"/warehouses/{wh_id}/locations",
        headers={"Authorization": f"Bearer {token}"},
        json={"code": "L1", "name": "L1", "location_type": "shelf", "capacity": 100}
    ).json()
    
    loc2 = client.post(
        f"/warehouses/{wh_id}/locations",
        headers={"Authorization": f"Bearer {token}"},
        json={"code": "L2", "name": "L2", "location_type": "shelf", "capacity": 100}
    ).json()
    
    # Assign product to L1
    assign_res = client.post(
        f"/products/{p_id}/locations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product_id": p_id,
            "location_id": loc1["id"],
            "warehouse_id": wh_id,
            "quantity": 50,
            "assignment_type": "manual"
        }
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["quantity"] == 50
    
    # Check inventory in L1
    inv_res = client.get(
        f"/locations/{loc1['id']}/inventory",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert len(inv_res.json()) == 1
    assert inv_res.json()[0]["quantity"] == 50
    
    # Relocate 20 to L2
    reloc_res = client.post(
        f"/products/{p_id}/relocate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "from_location_id": loc1["id"],
            "to_location_id": loc2["id"],
            "quantity": 20
        }
    )
    assert reloc_res.status_code == 200
    
    # Verify L1 has 30, L2 has 20
    inv1 = client.get(f"/locations/{loc1['id']}/inventory", headers={"Authorization": f"Bearer {token}"}).json()
    inv2 = client.get(f"/locations/{loc2['id']}/inventory", headers={"Authorization": f"Bearer {token}"}).json()
    
    assert inv1[0]["quantity"] == 30
    assert inv2[0]["quantity"] == 20

    # Verify audit logs
    logs = db.query(LocationAuditLog).filter(LocationAuditLog.product_id == p_id).all()
    assert len(logs) >= 2 # One for out, one for in
    actions = [log.action for log in logs]
    assert "relocation_out" in actions
    assert "relocation_in" in actions
