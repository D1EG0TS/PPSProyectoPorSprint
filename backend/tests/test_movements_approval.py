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
    op_user = db.query(User).filter(User.email == "op_approval@example.com").first()
    if not op_user:
        op_user = User(email="op_approval@example.com", password_hash="hash", full_name="Operator", role_id=role_op.id, is_active=True)
        db.add(op_user)
        
    # Create Manager User
    mgr_user = db.query(User).filter(User.email == "mgr_approval@example.com").first()
    if not mgr_user:
        mgr_user = User(email="mgr_approval@example.com", password_hash="hash", full_name="Manager", role_id=role_mgr.id, is_active=True)
        db.add(mgr_user)
        
    db.commit()
    
    # Create Category & Unit
    category = db.query(Category).first()
    if not category:
        category = Category(name="CatApproval", description="Desc")
        db.add(category)
    
    unit = db.query(Unit).first()
    if not unit:
        unit = Unit(name="UnitApproval", abbreviation="u")
        db.add(unit)
    
    db.commit()
    
    # Create Product
    product = db.query(Product).filter(Product.sku == "TEST-APPR").first()
    if not product:
        product = Product(
            sku="TEST-APPR", name="Test Product Approval", category_id=category.id, unit_id=unit.id,
            has_batch=True
        )
        db.add(product)
        db.commit()
        
    # Create Warehouse
    warehouse = db.query(Warehouse).filter(Warehouse.code == "WH-APPR").first()
    if not warehouse:
        warehouse = Warehouse(code="WH-APPR", name="Test Warehouse Approval", created_by=op_user.id)
        db.add(warehouse)
        db.commit()

    return {"op_user": op_user, "mgr_user": mgr_user, "product": product, "warehouse": warehouse}

def test_approval_flow(client, setup_data, db):
    op_user = setup_data["op_user"]
    mgr_user = setup_data["mgr_user"]
    product = setup_data["product"]
    warehouse = setup_data["warehouse"]
    
    op_token = create_access_token(subject=op_user.id)
    op_headers = {"Authorization": f"Bearer {op_token}"}
    
    mgr_token = create_access_token(subject=mgr_user.id)
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    
    # 1. Operator creates Request (IN to Warehouse)
    # IN type allows DRAFT -> SUBMIT directly without stock check
    payload = {
        "type": "IN",
        "destination_warehouse_id": warehouse.id,
        "reason": "Initial Stock",
        "items": [
            {"product_id": product.id, "quantity": 100, "notes": "Initial"}
        ]
    }
    response = client.post("/movements/requests/", json=payload, headers=op_headers)
    assert response.status_code == 200
    request_id = response.json()["id"]
    
    # 2. Operator Submits
    response = client.post(f"/movements/requests/{request_id}/submit", headers=op_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"
    
    # 3. Manager lists pending
    response = client.get("/movements/requests/pending", headers=mgr_headers)
    assert response.status_code == 200
    # There might be other pending requests from other tests if DB persists (unlikely with :memory:)
    # But filtering for our ID is safer
    pending_ids = [r["id"] for r in response.json()]
    assert request_id in pending_ids

    # 3b. Test Filters
    # Filter by correct type
    response = client.get(f"/movements/requests/pending?type=IN", headers=mgr_headers)
    assert response.status_code == 200
    assert request_id in [r["id"] for r in response.json()]

    # Filter by wrong type
    response = client.get(f"/movements/requests/pending?type=OUT", headers=mgr_headers)
    assert response.status_code == 200
    assert request_id not in [r["id"] for r in response.json()]

    # Filter by correct warehouse
    response = client.get(f"/movements/requests/pending?warehouse_id={warehouse.id}", headers=mgr_headers)
    assert response.status_code == 200
    assert request_id in [r["id"] for r in response.json()]
    
    # 4. Operator tries to approve (should fail)
    response = client.post(f"/movements/requests/{request_id}/approve", json={"notes": "nice"}, headers=op_headers)
    assert response.status_code == 403
    
    # 5. Manager Approves
    response = client.post(f"/movements/requests/{request_id}/approve", json={"notes": "Approved by Manager"}, headers=mgr_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"
    assert response.json()["approval_notes"] == "Approved by Manager"
    
    # 6. Manager Applies
    response = client.post(f"/movements/requests/{request_id}/apply", headers=mgr_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "COMPLETED"
    
    # 7. Verify Ledger
    # Directly query DB
    movement = db.query(Movement).filter(Movement.movement_request_id == request_id).first()
    assert movement is not None
    assert movement.quantity == 100
    assert movement.warehouse_id == warehouse.id
    assert movement.type == MovementType.IN
    assert movement.new_balance == 100
    
    # 8. Create OUT request
    # Now stock is 100.
    payload_out = {
        "type": "OUT",
        "source_warehouse_id": warehouse.id,
        "reason": "Sale",
        "items": [
            {"product_id": product.id, "quantity": 10}
        ]
    }
    response = client.post("/movements/requests/", json=payload_out, headers=op_headers)
    out_id = response.json()["id"]
    client.post(f"/movements/requests/{out_id}/submit", headers=op_headers)
    
    # Manager Approves & Applies OUT
    client.post(f"/movements/requests/{out_id}/approve", json={"notes": "Ok"}, headers=mgr_headers)
    response = client.post(f"/movements/requests/{out_id}/apply", headers=mgr_headers)
    assert response.status_code == 200
    
    # Verify Ledger for OUT
    movement_out = db.query(Movement).filter(Movement.movement_request_id == out_id).first()
    assert movement_out.quantity == -10
    assert movement_out.new_balance == 90 # 100 - 10