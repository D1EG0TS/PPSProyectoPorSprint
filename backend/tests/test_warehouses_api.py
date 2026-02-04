import sys
import os
# Ensure backend directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

# Import app relative to backend root
try:
    from app.main import app
except ImportError:
    # Fallback if running from within backend dir
    from main import app

from app.api import deps
from app.models.user import Base, User, Role
from app.models.warehouse import Warehouse
from typing import Generator

# Setup in-memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Create Roles
    roles = [
        Role(id=1, name="Admin", level=1),
        Role(id=2, name="Manager", level=2),
        Role(id=3, name="User", level=3),
        Role(id=4, name="Viewer", level=4),
        Role(id=5, name="Guest", level=5),
    ]
    for role in roles:
        session.add(role)
    session.commit()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[deps.get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# Helpers to create users and override dependency
def create_user_with_role(db, role_id, email):
    user = User(
        email=email,
        password_hash="secret",
        role_id=role_id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def override_auth(user):
    app.dependency_overrides[deps.get_current_user] = lambda: user

# Fixtures for common data
@pytest.fixture(scope="function")
def admin_user(db):
    return create_user_with_role(db, 1, "admin@test.com")

@pytest.fixture(scope="function")
def normal_user(db):
    return create_user_with_role(db, 3, "user@test.com")

@pytest.fixture(scope="function")
def sample_warehouse(db, admin_user):
    warehouse = Warehouse(
        code="WH-ADMIN",
        name="Admin Warehouse",
        location="Admin Loc",
        created_by=admin_user.id
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse

# Tests
def test_create_warehouse_admin(client, db, admin_user):
    override_auth(admin_user)
    
    response = client.post("/warehouses/", json={
        "code": "WH-NEW",
        "name": "New Warehouse",
        "location": "New Loc"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "WH-NEW"
    assert data["id"] is not None

def test_create_warehouse_duplicate_code(client, db, admin_user, sample_warehouse):
    override_auth(admin_user)
    
    response = client.post("/warehouses/", json={
        "code": "WH-ADMIN",
        "name": "Duplicate Warehouse"
    })
    assert response.status_code == 400

def test_list_warehouses_role3(client, db, normal_user, sample_warehouse):
    override_auth(normal_user)
    
    response = client.get("/warehouses/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

def test_create_warehouse_role3_forbidden(client, db, normal_user):
    override_auth(normal_user)
    
    response = client.post("/warehouses/", json={
        "code": "WH-USER",
        "name": "User Warehouse"
    })
    assert response.status_code == 403

def test_list_warehouses_role5_forbidden(client, db):
    guest = create_user_with_role(db, 5, "guest@test.com")
    override_auth(guest)
    
    response = client.get("/warehouses/")
    assert response.status_code == 403

def test_update_warehouse_admin(client, db, admin_user, sample_warehouse):
    override_auth(admin_user)
    
    response = client.put(f"/warehouses/{sample_warehouse.id}", json={
        "name": "Updated Warehouse"
    })
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Warehouse"

def test_delete_warehouse_admin(client, db, admin_user, sample_warehouse):
    override_auth(admin_user)
    
    response = client.delete(f"/warehouses/{sample_warehouse.id}")
    assert response.status_code == 200
    
    # Verify soft delete
    db.refresh(sample_warehouse)
    assert sample_warehouse.is_active is False

def test_create_location(client, db, admin_user):
    override_auth(admin_user)
    
    # Create new warehouse for location test
    wh_res = client.post("/warehouses/", json={
        "code": "WH-LOC",
        "name": "Location Warehouse"
    })
    assert wh_res.status_code == 200
    wh_id = wh_res.json()["id"]
    
    response = client.post(f"/warehouses/{wh_id}/locations", json={
        "code": "LOC-1",
        "name": "Location 1"
    })
    assert response.status_code == 200
    assert response.json()["path"] == "/LOC-1"

def test_get_locations(client, db, normal_user, admin_user):
    # Setup: Create warehouse and location as admin
    wh = Warehouse(
        code="WH-LOC",
        name="Location Warehouse",
        created_by=admin_user.id
    )
    db.add(wh)
    db.commit()
    
    # Need to add location model import or create via API
    # Creating via API is easier/safer
    override_auth(admin_user)
    client.post(f"/warehouses/{wh.id}/locations", json={
        "code": "LOC-1",
        "name": "Location 1"
    })
    
    # Test: Get locations as normal user
    override_auth(normal_user)
    response = client.get(f"/warehouses/{wh.id}/locations")
    assert response.status_code == 200
    assert len(response.json()) >= 1

def test_update_location(client, db):
    # Setup
    admin = create_user_with_role(db, 1, "admin@test.com")
    override_auth(admin)
    
    wh_resp = client.post("/warehouses/", json={
        "code": "WH-LOC-UPD", 
        "name": "Location Update Warehouse",
        "location": "Test Loc"
    })
    wh_id = wh_resp.json()["id"]
    
    loc_resp = client.post(f"/warehouses/{wh_id}/locations", json={
        "code": "LOC-OLD",
        "name": "Location Old"
    })
    loc_id = loc_resp.json()["id"]
    
    # Test Update
    response = client.put(f"/warehouses/{wh_id}/locations/{loc_id}", json={
        "name": "Location New",
        "code": "LOC-NEW"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Location New"
    assert data["code"] == "LOC-NEW"
    # Check path update
    assert data["path"] == "/LOC-NEW"

def test_delete_location(client, db):
    # Setup
    admin = create_user_with_role(db, 1, "admin@test.com")
    override_auth(admin)
    
    wh_resp = client.post("/warehouses/", json={
        "code": "WH-LOC-DEL", 
        "name": "Location Delete Warehouse",
        "location": "Test Loc"
    })
    wh_id = wh_resp.json()["id"]
    
    loc_resp = client.post(f"/warehouses/{wh_id}/locations", json={
        "code": "LOC-DEL",
        "name": "Location To Delete"
    })
    loc_id = loc_resp.json()["id"]
    
    # Test Delete
    response = client.delete(f"/warehouses/{wh_id}/locations/{loc_id}")
    assert response.status_code == 204
    
    # Verify deletion
    get_resp = client.get(f"/warehouses/{wh_id}/locations")
    # Should be empty or not contain this loc
    locs = get_resp.json()
    assert not any(l["id"] == loc_id for l in locs)


