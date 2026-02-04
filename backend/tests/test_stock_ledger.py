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
    # Create Role 4 (Operator)
    role_op = db.query(Role).filter(Role.name == "operator").first()
    if not role_op:
        role_op = Role(name="operator", description="Operator", level=10)
        db.add(role_op)
    
    # Create Role 2 (Manager)
    role_mgr = db.query(Role).filter(Role.name == "manager").first()
    if not role_mgr:
        role_mgr = Role(name="manager", description="Manager", level=30)
        db.add(role_mgr)
        
    db.commit()
    
    # Create Operator User
    op_user = db.query(User).filter(User.email == "op_stock@example.com").first()
    if not op_user:
        op_user = User(email="op_stock@example.com", password_hash="hash", full_name="Operator", role_id=role_op.id, is_active=True)
        db.add(op_user)
        
    # Create Manager User
    mgr_user = db.query(User).filter(User.email == "mgr_stock@example.com").first()
    if not mgr_user:
        mgr_user = User(email="mgr_stock@example.com", password_hash="hash", full_name="Manager", role_id=role_mgr.id, is_active=True)
        db.add(mgr_user)
        
    db.commit()
    
    # Create Category & Unit
    category = db.query(Category).first()
    if not category:
        category = Category(name="CatStock", description="Desc")
        db.add(category)
    
    unit = db.query(Unit).first()
    if not unit:
        unit = Unit(name="UnitStock", abbreviation="u")
        db.add(unit)
    
    db.commit()
    
    # Create Product
    product = db.query(Product).filter(Product.sku == "TEST-STOCK").first()
    if not product:
        product = Product(
            sku="TEST-STOCK", name="Test Product Stock", category_id=category.id, unit_id=unit.id,
            has_batch=True
        )
        db.add(product)
        db.commit()
        
    # Create Warehouse
    warehouse = db.query(Warehouse).filter(Warehouse.code == "WH-STOCK").first()
    if not warehouse:
        warehouse = Warehouse(code="WH-STOCK", name="Test Warehouse Stock", created_by=op_user.id)
        db.add(warehouse)
        db.commit()

    return {"op_user": op_user, "mgr_user": mgr_user, "product": product, "warehouse": warehouse}

def test_stock_ledger_endpoints(client, setup_data, db):
    op_user = setup_data["op_user"]
    mgr_user = setup_data["mgr_user"]
    product = setup_data["product"]
    warehouse = setup_data["warehouse"]
    
    mgr_token = create_access_token(subject=mgr_user.id)
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    
    op_token = create_access_token(subject=op_user.id)
    op_headers = {"Authorization": f"Bearer {op_token}"}
    
    # 1. Create Initial Stock (IN 100)
    payload = {
        "type": "IN",
        "destination_warehouse_id": warehouse.id,
        "reason": "Initial Stock",
        "items": [
            {"product_id": product.id, "quantity": 100}
        ]
    }
    response = client.post("/movements/requests/", json=payload, headers=op_headers)
    assert response.status_code == 200
    request_id = response.json()["id"]
    
    # Submit, Approve, Apply
    client.post(f"/movements/requests/{request_id}/submit", headers=op_headers)
    client.post(f"/movements/requests/{request_id}/approve", json={"notes": "Ok"}, headers=mgr_headers)
    client.post(f"/movements/requests/{request_id}/apply", headers=mgr_headers)
    
    # 2. Create OUT 20
    payload_out = {
        "type": "OUT",
        "source_warehouse_id": warehouse.id,
        "reason": "Sale",
        "items": [
            {"product_id": product.id, "quantity": 20}
        ]
    }
    response = client.post("/movements/requests/", json=payload_out, headers=op_headers)
    out_id = response.json()["id"]
    
    client.post(f"/movements/requests/{out_id}/submit", headers=op_headers)
    client.post(f"/movements/requests/{out_id}/approve", json={"notes": "Ok"}, headers=mgr_headers)
    client.post(f"/movements/requests/{out_id}/apply", headers=mgr_headers)
    
    # 3. Test GET /movements/stock
    # Filter by product and warehouse
    response = client.get(f"/movements/stock?product_id={product.id}&warehouse_id={warehouse.id}", headers=mgr_headers)
    assert response.status_code == 200
    assert response.json()["stock"] == 80 # 100 - 20
    
    # Test global stock (should be same as there's only one warehouse)
    response = client.get(f"/movements/stock?product_id={product.id}", headers=mgr_headers)
    assert response.status_code == 200
    assert response.json()["stock"] == 80
    
    # 4. Test GET /products/{id}/ledger
    response = client.get(f"/products/{product.id}/ledger", headers=mgr_headers)
    assert response.status_code == 200
    ledger = response.json()
    assert len(ledger) >= 2
    # Check ordering (descending)
    assert ledger[0]["quantity"] == -20 # Latest
    assert ledger[1]["quantity"] == 100 # Previous
    
    # 5. Test GET /warehouses/{id}/stock
    response = client.get(f"/warehouses/{warehouse.id}/stock", headers=mgr_headers)
    assert response.status_code == 200
    stock_list = response.json()
    # Find our product
    item = next((i for i in stock_list if i["product_id"] == product.id), None)
    assert item is not None
    assert item["quantity"] == 80
