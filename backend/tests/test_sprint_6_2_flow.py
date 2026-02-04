import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.inventory_refs import Category, Unit
from app.models.product import Product, ProductBatch, Base as ProductBase
from app.core.security import create_access_token
from app.core.config import settings
import logging

# Setup in-memory DB
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
    # Ensure all models are imported so Base.metadata knows about them
    # User Base and Product Base might be different if they don't share same Base?
    # In app/models/user.py: Base = declarative_base()
    # In app/models/product.py: Base = declarative_base() if not shared.
    # Usually in FastAPI projects, there is one Base in app.db.base_class.
    # But here imports show app.models.user.Base.
    # Let's assume they share or I need to create both.
    # Checking imports in test_sprint_6_1.py: "from app.models.user import Base, User, Role"
    # And "from app.models.product import Product, ProductBatch, Base as ProductBase"
    # This implies they might be different Bases!
    # If they are different, I need to create_all for both.
    
    Base.metadata.create_all(bind=engine)
    try:
        ProductBase.metadata.create_all(bind=engine)
    except:
        pass # Might be same Base

    session = TestingSessionLocal()
    
    # Create Role (Admin)
    role_admin = Role(id=1, name="admin", description="Admin", level=100)
    session.add(role_admin)
    
    # Create User
    admin = User(
        email="admin_sprint62@example.com", 
        password_hash="hash", 
        full_name="Admin Sprint 6.2", 
        role_id=1,
        is_active=True
    )
    session.add(admin)
    
    # Create Dependencies
    cat = Category(id=1, name="General", description="General items")
    unit = Unit(id=1, name="Piece", abbreviation="pc")
    session.add(cat)
    session.add(unit)
    
    session.commit()
    session.refresh(admin)
    
    yield session
    
    session.close()
    Base.metadata.drop_all(bind=engine)
    try:
        ProductBase.metadata.drop_all(bind=engine)
    except:
        pass

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
def superuser_token_headers(client, db):
    admin = db.query(User).filter(User.email == "admin_sprint62@example.com").first()
    token = create_access_token(subject=str(admin.id))
    return {"Authorization": f"Bearer {token}"}

def test_sprint_6_2_full_flow(client: TestClient, db: Session, superuser_token_headers):
    # 1. Create Product without batches
    product_data = {
        "sku": "FLOW-001",
        "name": "Flow Product No Batch",
        "category_id": 1,
        "unit_id": 1,
        "price": 10.0,
        "cost": 5.0,
        "has_batch": False
    }
    r = client.post("/products/", json=product_data, headers=superuser_token_headers)
    assert r.status_code == 200, f"Error: {r.text}"
    product_no_batch = r.json()
    assert product_no_batch["sku"] == "FLOW-001"
    assert product_no_batch["has_batch"] is False

    # 2. Create Product WITH batches
    product_batch_data = {
        "sku": "FLOW-002",
        "name": "Flow Product With Batch",
        "category_id": 1,
        "unit_id": 1,
        "price": 20.0,
        "cost": 10.0,
        "has_batch": True,
        "has_expiration": True
    }
    r = client.post("/products/", json=product_batch_data, headers=superuser_token_headers)
    assert r.status_code == 200, f"Error: {r.text}"
    product_with_batch = r.json()
    assert product_with_batch["sku"] == "FLOW-002"
    assert product_with_batch["has_batch"] is True

    # 3. Create Initial Batch
    batch_data = {
        "batch_number": "B001",
        "quantity": 100,
        "expiration_date": "2025-12-31"
    }
    r = client.post(f"/products/{product_with_batch['id']}/batches", json=batch_data, headers=superuser_token_headers)
    assert r.status_code == 200, f"Error: {r.text}"
    batch = r.json()
    assert batch["batch_number"] == "B001"
    assert batch["quantity"] == 100

    # 4. Verify Batches List
    r = client.get(f"/products/{product_with_batch['id']}/batches", headers=superuser_token_headers)
    assert r.status_code == 200
    batches = r.json()
    assert len(batches) == 1
    assert batches[0]["batch_number"] == "B001"

    # 5. Verify SKU Uniqueness (Real-time check equivalent)
    # Try to create product with same SKU
    duplicate_data = {
        "sku": "FLOW-002",
        "name": "Duplicate SKU",
        "category_id": 1,
        "unit_id": 1
    }
    r = client.post("/products/", json=duplicate_data, headers=superuser_token_headers)
    assert r.status_code == 400
    assert "already exists" in r.json()["detail"]

    # 6. Verify Scan Endpoint (Real-time check)
    r = client.get(f"/products/scan/FLOW-002", headers=superuser_token_headers)
    assert r.status_code == 200
    assert r.json()["id"] == product_with_batch["id"]

    r = client.get(f"/products/scan/NONEXISTENT", headers=superuser_token_headers)
    assert r.status_code == 404
