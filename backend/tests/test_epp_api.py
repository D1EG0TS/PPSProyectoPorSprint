import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import date, timedelta

from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit
from app.models.epp import EPP, EPPStatus
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
    role_user = Role(id=5, name="user", level=5)
    session.add_all([role_admin, role_user])
    
    # Users
    admin = User(email="admin@test.com", password_hash="x", role_id=1, full_name="Admin", is_active=True)
    user = User(email="user@test.com", password_hash="x", role_id=5, full_name="User", is_active=True)
    session.add_all([admin, user])
    session.commit()
    
    # Refs
    cat = Category(name="Cat1")
    unit = Unit(name="Unit1", abbreviation="u1")
    session.add_all([cat, unit])
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

@pytest.fixture(scope="module")
def test_user(db):
    return db.query(User).filter(User.email == "user@test.com").first()

def test_create_epp(client, admin_token, db):
    # Create product first
    product = Product(name="Helmet", sku="HELM-001", category_id=1, unit_id=1)
    db.add(product)
    db.commit()
    
    response = client.post(
        "/epp/",
        json={
            "product_id": product.id,
            "size": "L",
            "certification": "ISO-123",
            "useful_life_days": 365
        },
        headers=admin_token
    )
    assert response.status_code == 200
    data = response.json()
    assert data["size"] == "L"
    assert data["status"] == "AVAILABLE"
    assert data["product"]["name"] == "Helmet"
    assert data["product"]["sku"] == "HELM-001"

def test_assign_epp_expiration(client, admin_token, db, test_user):
    # Setup EPP and User
    product = Product(name="Gloves", sku="GLOV-001", category_id=1, unit_id=1)
    db.add(product)
    db.commit()
    
    epp = EPP(product_id=product.id, useful_life_days=30, status=EPPStatus.AVAILABLE)
    db.add(epp)
    db.commit()
    
    # Assign
    response = client.post(
        f"/epp/{epp.id}/assign?user_id={test_user.id}",
        headers=admin_token
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ASSIGNED"
    assert data["expiration_date"] == (date.today() + timedelta(days=30)).isoformat()

def test_expiring_alert(client, admin_token, db, test_user):
    # Scenario: Create EPP, assign it such that it expires in 4 days.
    # Check if it appears in /expiring?days=5
    
    product = Product(name="Vest", sku="VEST-001", category_id=1, unit_id=1)
    db.add(product)
    db.commit()
    
    # Manually create assigned EPP expiring in 4 days
    expiration = date.today() + timedelta(days=4)
    epp = EPP(
        product_id=product.id,
        useful_life_days=30,
        status=EPPStatus.ASSIGNED,
        assigned_to=test_user.id,
        assignment_date=date.today() - timedelta(days=26),
        expiration_date=expiration
    )
    db.add(epp)
    db.commit()
    
    response = client.get("/epp/expiring?days=5", headers=admin_token)
    assert response.status_code == 200
    data = response.json()
    
    found = False
    for item in data:
        if item["id"] == epp.id:
            found = True
            break
    assert found

def test_replace_epp(client, admin_token, db, test_user):
    product = Product(name="Boots", sku="BOOT-001", category_id=1, unit_id=1)
    db.add(product)
    db.commit()
    
    epp = EPP(
        product_id=product.id,
        useful_life_days=100,
        status=EPPStatus.ASSIGNED,
        assigned_to=test_user.id,
        assignment_date=date.today(),
        expiration_date=date.today() + timedelta(days=100)
    )
    db.add(epp)
    db.commit()
    
    response = client.post(f"/epp/{epp.id}/replace", headers=admin_token)
    assert response.status_code == 200
    new_epp_data = response.json()
    
    assert new_epp_data["id"] != epp.id
    assert new_epp_data["status"] == "ASSIGNED" # Should be auto-assigned
    assert new_epp_data["assigned_to"] == test_user.id
    
    # Check old epp
    db.refresh(epp)
    assert epp.status == "REPLACED"
