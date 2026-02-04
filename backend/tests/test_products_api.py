import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from decimal import Decimal
from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit
from app.core.security import create_access_token

# Setup in-memory DB for testing endpoints
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Create Role 1 (Admin) and Role 5 (User)
    role_admin = Role(id=1, name="admin", description="Admin", level=100)
    role_user = Role(id=5, name="user", description="User", level=10)
    session.add(role_admin)
    session.add(role_user)
    
    # Create Users
    admin = User(
        email="admin@example.com", 
        password_hash="hash", 
        full_name="Admin User", 
        role_id=1,
        is_active=True
    )
    user = User(
        email="user@example.com", 
        password_hash="hash", 
        full_name="Regular User", 
        role_id=5,
        is_active=True
    )
    session.add(admin)
    session.add(user)
    session.commit()
    session.refresh(admin)
    session.refresh(user)
    
    # Create Dependencies
    cat = Category(name="Electronics", description="Gadgets")
    unit = Unit(name="Piece", abbreviation="pc")
    session.add(cat)
    session.add(unit)
    session.commit()
    session.refresh(cat)
    session.refresh(unit)
    
    # Create Product
    prod = Product(
        sku="TEST-001",
        barcode="123456789",
        name="Test Product",
        description="Desc",
        category_id=cat.id,
        unit_id=unit.id,
        cost=10.0,
        price=20.0,
        is_active=True
    )
    session.add(prod)
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

def test_read_products_as_admin(client, db):
    # Get Admin User ID
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    token = create_access_token(subject=str(admin.id))
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/products/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["sku"] == "TEST-001"
    assert float(data[0]["cost"]) == 10.0  # Should be visible
    assert float(data[0]["price"]) == 20.0 # Should be visible

def test_read_products_as_user(client, db):
    # Get User ID
    user = db.query(User).filter(User.email == "user@example.com").first()
    token = create_access_token(subject=str(user.id))
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/products/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["sku"] == "TEST-001"
    assert data[0]["cost"] is None  # Should be hidden
    assert data[0]["price"] is None # Should be hidden

def test_scan_product(client, db):
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    token = create_access_token(subject=str(admin.id))
    headers = {"Authorization": f"Bearer {token}"}
    
    # Scan by SKU
    response = client.get("/products/scan/TEST-001", headers=headers)
    assert response.status_code == 200
    assert response.json()["sku"] == "TEST-001"
    
    # Scan by Barcode
    response = client.get("/products/scan/123456789", headers=headers)
    assert response.status_code == 200
    assert response.json()["sku"] == "TEST-001"

def test_read_categories(client, db):
    user = db.query(User).filter(User.email == "user@example.com").first()
    token = create_access_token(subject=str(user.id))
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/products/categories/", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert response.json()[0]["name"] == "Electronics"
