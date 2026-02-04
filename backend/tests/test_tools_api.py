import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit, Condition
from app.models.warehouse import Warehouse, Location
from app.models.tool import Tool, ToolStatus
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
    role_manager = Role(id=2, name="manager", level=2)
    role_user = Role(id=5, name="user", level=5)
    session.add_all([role_admin, role_manager, role_user])
    
    # Users
    admin = User(email="admin@test.com", password_hash="x", role_id=1, full_name="Admin")
    manager = User(email="manager@test.com", password_hash="x", role_id=2, full_name="Manager")
    user = User(email="user@test.com", password_hash="x", role_id=5, full_name="User")
    session.add_all([admin, manager, user])
    session.commit()
    
    # Refs
    cat = Category(name="Cat1")
    unit = Unit(name="Unit1", abbreviation="u1")
    cond_new = Condition(name="NEW")
    cond_used = Condition(name="USED")
    session.add_all([cat, unit, cond_new, cond_used])
    session.commit()
    
    # Product
    prod = Product(sku="P1", name="Drill", category_id=cat.id, unit_id=unit.id)
    session.add(prod)
    
    # Warehouse & Location
    wh = Warehouse(code="WH1", name="Main", created_by=admin.id)
    session.add(wh)
    session.commit()
    
    loc = Location(code="L1", name="Shelf 1", warehouse_id=wh.id)
    session.add(loc)
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
    yield TestClient(app)
    del app.dependency_overrides[deps.get_db]

def test_create_tool(client, db):
    admin = db.query(User).filter(User.email == "admin@test.com").first()
    token = create_access_token(subject=str(admin.id))
    headers = {"Authorization": f"Bearer {token}"}
    
    prod = db.query(Product).first()
    cond = db.query(Condition).first()
    
    data = {
        "product_id": prod.id,
        "serial_number": "SN-001",
        "condition_id": cond.id,
        "status": "AVAILABLE"
    }
    
    res = client.post("/tools/", json=data, headers=headers)
    assert res.status_code == 200
    assert res.json()["serial_number"] == "SN-001"
    assert res.json()["status"] == "AVAILABLE"

def test_assign_tool(client, db):
    admin = db.query(User).filter(User.email == "admin@test.com").first()
    token = create_access_token(subject=str(admin.id))
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get created tool
    tool = db.query(Tool).filter(Tool.serial_number == "SN-001").first()
    user = db.query(User).filter(User.email == "user@test.com").first()
    
    data = {"user_id": user.id, "notes": "Project X"}
    res = client.post(f"/tools/{tool.id}/assign", json=data, headers=headers)
    
    assert res.status_code == 200
    assert res.json()["assigned_to"] == user.id
    assert res.json()["status"] == "ASSIGNED"

def test_user_view_own_tools(client, db):
    # Login as user
    user = db.query(User).filter(User.email == "user@test.com").first()
    token = create_access_token(subject=str(user.id))
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.get(f"/tools/user/{user.id}", headers=headers)
    assert res.status_code == 200
    tools = res.json()
    assert len(tools) >= 1
    assert tools[0]["serial_number"] == "SN-001"

def test_check_in_tool(client, db):
    # Return tool to warehouse
    admin = db.query(User).filter(User.email == "admin@test.com").first()
    token = create_access_token(subject=str(admin.id))
    headers = {"Authorization": f"Bearer {token}"}
    
    tool = db.query(Tool).filter(Tool.serial_number == "SN-001").first()
    loc = db.query(Location).first()
    cond_used = db.query(Condition).filter(Condition.name == "USED").first()
    
    data = {
        "location_id": loc.id,
        "condition_id": cond_used.id,
        "notes": "Returned used"
    }
    
    res = client.post(f"/tools/{tool.id}/check-in", json=data, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "AVAILABLE"
    assert res.json()["assigned_to"] is None
    assert res.json()["location_id"] == loc.id
    assert res.json()["condition_id"] == cond_used.id
