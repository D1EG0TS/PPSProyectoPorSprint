import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.product import Product, ProductBatch
from app.models.warehouse import Warehouse
from app.models.inventory_refs import Category, Unit
from app.models.movement import MovementRequest, MovementStatus, MovementType, Movement
from app.core.security import create_access_token

# Setup in-memory DB for testing endpoints
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

@pytest.fixture
def setup_data(db: Session):
    # Create Role 4 (Operator) if not exists
    role = db.query(Role).filter(Role.name == "operator").first()
    if not role:
        role = Role(name="operator", description="Operator", level=10)
        db.add(role)
        db.commit()
    
    # Create User with Role 4
    user = db.query(User).filter(User.email == "op@example.com").first()
    if not user:
        user = User(email="op@example.com", password_hash="hash", full_name="Operator", role_id=role.id, is_active=True)
        db.add(user)
        db.commit()
    
    # Create Category & Unit
    category = db.query(Category).first()
    if not category:
        category = Category(name="Cat1", description="Desc")
        db.add(category)
    
    unit = db.query(Unit).first()
    if not unit:
        unit = Unit(name="Unit1", abbreviation="u")
        db.add(unit)
    
    db.commit()
    
    # Create Product
    product = db.query(Product).filter(Product.sku == "TEST-MOV-API").first()
    if not product:
        product = Product(
            sku="TEST-MOV-API", name="Test Product", category_id=category.id, unit_id=unit.id,
            has_batch=True
        )
        db.add(product)
        db.commit()
        
    # Create Warehouse
    warehouse = db.query(Warehouse).filter(Warehouse.code == "WH-TEST").first()
    if not warehouse:
        warehouse = Warehouse(code="WH-TEST", name="Test Warehouse", created_by=user.id)
        db.add(warehouse)
        db.commit()

    return {"user": user, "product": product, "warehouse": warehouse}

def test_create_movement_request(client, setup_data, db):
    user = setup_data["user"]
    product = setup_data["product"]
    warehouse = setup_data["warehouse"]
    
    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "type": "IN",
        "destination_warehouse_id": warehouse.id,
        "reason": "Initial stock",
        "items": [
            {
                "product_id": product.id,
                "quantity": 100,
                "notes": "Test item"
            }
        ]
    }
    
    response = client.post("/movements/requests/", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "DRAFT"
    assert len(data["items"]) == 1

def test_submit_movement_request_out_insufficient_stock(client, setup_data, db):
    user = setup_data["user"]
    product = setup_data["product"]
    warehouse = setup_data["warehouse"]
    
    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create OUT request (Draft)
    payload = {
        "type": "OUT",
        "source_warehouse_id": warehouse.id,
        "reason": "Sale",
        "items": [
            {
                "product_id": product.id,
                "quantity": 50
            }
        ]
    }
    
    response = client.post("/movements/requests/", json=payload, headers=headers)
    assert response.status_code == 200
    request_id = response.json()["id"]
    
    # 2. Submit (Should fail because no stock in warehouse)
    response = client.post(f"/movements/requests/{request_id}/submit", headers=headers)
    assert response.status_code == 400
    assert "Insufficient warehouse stock" in response.json()["detail"]

def test_submit_movement_request_out_success(client, setup_data, db):
    user = setup_data["user"]
    product = setup_data["product"]
    warehouse = setup_data["warehouse"]
    
    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}
    
    # 0. Add stock first (Mocking ledger directly for setup)
    # We need to make sure previous tests didn't mess up. 
    # Better to add stock via db session directly.
    movement = Movement(
        type=MovementType.IN,
        product_id=product.id,
        warehouse_id=warehouse.id,
        quantity=100,
        previous_balance=0,
        new_balance=100
    )
    db.add(movement)
    db.commit()
    
    # 1. Create OUT request
    payload = {
        "type": "OUT",
        "source_warehouse_id": warehouse.id,
        "reason": "Sale Success",
        "items": [
            {
                "product_id": product.id,
                "quantity": 50
            }
        ]
    }
    
    response = client.post("/movements/requests/", json=payload, headers=headers)
    assert response.status_code == 200
    request_id = response.json()["id"]
    
    # 2. Submit (Should succeed now)
    response = client.post(f"/movements/requests/{request_id}/submit", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"
