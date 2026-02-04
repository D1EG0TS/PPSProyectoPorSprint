import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from decimal import Decimal
from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.inventory_refs import Category, Unit
from app.models.product import Product, ProductBatch, Base as ProductBase
from app.core.security import create_access_token
import datetime
import logging

from sqlalchemy.pool import StaticPool

# Setup logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

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
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Create Role (Admin)
    role_admin = Role(id=1, name="admin", description="Admin", level=100)
    session.add(role_admin)
    
    # Create User
    admin = User(
        email="admin_sprint61@example.com", 
        password_hash="hash", 
        full_name="Admin Sprint 6.1", 
        role_id=1,
        is_active=True
    )
    session.add(admin)
    
    # Create Dependencies
    cat = Category(name="Perishable", description="Perishable items")
    unit = Unit(name="Box", abbreviation="bx")
    session.add(cat)
    session.add(unit)
    
    session.commit()
    session.refresh(admin)
    session.refresh(cat)
    session.refresh(unit)
    
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
def admin_token_headers(client, db):
    admin = db.query(User).filter(User.email == "admin_sprint61@example.com").first()
    token = create_access_token(subject=str(admin.id))
    return {"Authorization": f"Bearer {token}"}

def test_sprint_6_1_workflow(client, admin_token_headers, db):
    # 1. Create Product with has_batch=True and has_expiration=True
    cat = db.query(Category).first()
    unit = db.query(Unit).first()
    
    product_data = {
        "sku": "MILK-001",
        "barcode": "88888888",
        "name": "Fresh Milk",
        "description": "1L Carton",
        "category_id": cat.id,
        "unit_id": unit.id,
        "cost": 1.50,
        "price": 2.50,
        "has_batch": True,
        "has_expiration": True,
        "is_active": True
    }
    
    response = client.post("/products/", json=product_data, headers=admin_token_headers)
    assert response.status_code == 200
    product = response.json()
    assert product["sku"] == "MILK-001"
    assert product["has_batch"] is True
    assert product["has_expiration"] is True
    product_id = product["id"]

    # 2. Try to create batch without expiration date (should fail for perishable)
    batch_data_invalid = {
        "batch_number": "BATCH-001",
        "quantity": 100
        # Missing expiration_date
    }
    response = client.post(f"/products/{product_id}/batches", json=batch_data_invalid, headers=admin_token_headers)
    assert response.status_code == 400
    assert "Expiration date is required" in response.json()["detail"]

    # 3. Create batch with valid data
    today = datetime.date.today()
    expiration = today + datetime.timedelta(days=7)
    batch_data_valid = {
        "batch_number": "BATCH-001",
        "quantity": 100,
        "manufactured_date": str(today),
        "expiration_date": str(expiration)
    }
    response = client.post(f"/products/{product_id}/batches", json=batch_data_valid, headers=admin_token_headers)
    assert response.status_code == 200
    batch = response.json()
    assert batch["batch_number"] == "BATCH-001"
    assert batch["quantity"] == 100
    batch_id = batch["id"]

    # 4. Verify batch in product list
    response = client.get(f"/products/{product_id}/batches", headers=admin_token_headers)
    assert response.status_code == 200
    batches = response.json()
    assert len(batches) == 1
    assert batches[0]["id"] == batch_id

    # 5. Update stock via batch (PUT)
    update_data = {
        "quantity": 150
    }
    response = client.put(f"/products/batches/{batch_id}", json=update_data, headers=admin_token_headers)
    assert response.status_code == 200
    updated_batch = response.json()
    assert updated_batch["quantity"] == 150

    # 6. Verify update persisted
    response = client.get(f"/products/{product_id}/batches", headers=admin_token_headers)
    assert response.json()[0]["quantity"] == 150
    
    print("\nSprint 6.1 Tests Passed!")
