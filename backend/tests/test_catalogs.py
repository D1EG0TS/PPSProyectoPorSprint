import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from decimal import Decimal
from datetime import datetime, date
import time

from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit
from app.models.warehouse import Warehouse
from app.models.location_models import StorageLocation, LocationType
from app.models.movement import Movement, MovementType
from app.models.product_location_models import ProductLocationAssignment, AssignmentType
from app.core.security import create_access_token

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
    
    # 1. Setup Roles
    roles = [
        Role(id=1, name="admin", level=1),
        Role(id=3, name="internal", level=3),
        Role(id=4, name="operational", level=4),
        Role(id=5, name="guest", level=5)
    ]
    session.add_all(roles)
    session.commit()
    
    # 2. Setup Users
    users = [
        User(email="admin@test.com", password_hash="x", full_name="Admin", role_id=1, is_active=True),
        User(email="internal@test.com", password_hash="x", full_name="Internal", role_id=3, is_active=True),
        User(email="op@test.com", password_hash="x", full_name="Op", role_id=4, is_active=True),
        User(email="guest@test.com", password_hash="x", full_name="Guest", role_id=5, is_active=True)
    ]
    session.add_all(users)
    session.commit()
    
    # 3. Setup Dependencies
    cat = Category(name="TestCat", description="Desc")
    unit = Unit(name="Unit", abbreviation="u")
    wh = Warehouse(code="WH1", name="Main Warehouse", created_by=users[0].id)
    session.add_all([cat, unit, wh])
    session.commit()
    session.refresh(wh)
    
    # 4. Setup Locations
    loc = StorageLocation(
        warehouse_id=wh.id, 
        code="A-01", 
        name="Loc 1", 
        location_type=LocationType.SHELF,
        aisle="A", rack="1", shelf="1", position="1"
    )
    session.add(loc)
    session.commit()
    session.refresh(loc)
    
    # 5. Setup Product
    prod = Product(
        sku="P-001", 
        name="Test Product", 
        category_id=cat.id, 
        unit_id=unit.id, 
        cost=10.0, 
        price=20.0,
        min_stock=5,
        is_active=True
    )
    session.add(prod)
    session.commit()
    session.refresh(prod)
    
    # 6. Setup Movements (Stock = 50)
    mov = Movement(
        product_id=prod.id,
        warehouse_id=wh.id,
        type=MovementType.IN,
        quantity=50,
        previous_balance=0,
        new_balance=50
    )
    session.add(mov)
    
    # 7. Setup Assignments
    assign = ProductLocationAssignment(
        product_id=prod.id,
        location_id=loc.id,
        warehouse_id=wh.id,
        quantity=50,
        assignment_type=AssignmentType.MANUAL
    )
    session.add(assign)
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

def get_token(db, email):
    user = db.query(User).filter(User.email == email).first()
    return create_access_token(subject=str(user.id))

# --- Tests ---

def test_public_catalog_role_5(client, db):
    # Role 5 (Guest) accessing /public
    # No auth needed usually, but we can verify what they see
    response = client.get("/catalog/public")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    item = data[0]
    # Check fields present/absent
    assert "sku" in item
    assert "name" in item
    assert "total_stock" not in item # Public shouldn't see stock
    assert "cost" not in item

def test_operational_catalog_role_4(client, db):
    token = get_token(db, "op@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/catalog/operational", headers=headers)
    assert response.status_code == 200
    data = response.json()
    item = data[0]
    
    assert "total_stock" in item
    assert item["total_stock"] == 50
    assert "cost" not in item
    assert "locations" not in item

def test_internal_catalog_role_3(client, db):
    token = get_token(db, "internal@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/catalog/internal", headers=headers)
    assert response.status_code == 200
    data = response.json()
    item = data[0]
    
    assert "stock_by_warehouse" in item
    assert len(item["stock_by_warehouse"]) > 0
    assert item["stock_by_warehouse"][0]["quantity"] == 50
    assert "needs_reorder" in item
    assert item["needs_reorder"] == False # 50 > 5

def test_admin_catalog_role_1(client, db):
    token = get_token(db, "admin@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Admin gets internal endpoint but with AdminCatalogItem schema in unified search
    # Or use search endpoint
    response = client.get("/catalog/search?q=Test", headers=headers)
    assert response.status_code == 200
    data = response.json()
    item = data[0]
    
    assert "locations" in item
    assert len(item["locations"]) > 0
    assert item["locations"][0]["location_code"] == "A-01"
    assert "cost" in item
    assert float(item["cost"]) == 10.0

def test_security_role_5_access_internal(client, db):
    # Guest trying to access internal
    # Since guest is usually unauthenticated, or has token for role 5
    # Public endpoint is open. Internal requires auth.
    
    # 1. Without token -> 401
    response = client.get("/catalog/internal")
    assert response.status_code == 401
    
    # 2. With Guest token -> 403
    token = get_token(db, "guest@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/catalog/internal", headers=headers)
    assert response.status_code == 403

def test_performance_many_products(client, db):
    # Create 100 products
    cat = db.query(Category).first()
    unit = db.query(Unit).first()
    
    products = []
    for i in range(100):
        products.append(Product(
            sku=f"PERF-{i}", 
            name=f"Perf Product {i}", 
            category_id=cat.id, 
            unit_id=unit.id,
            cost=10.0,
            price=20.0
        ))
    db.add_all(products)
    db.commit()
    
    # Time the request
    start_time = time.time()
    response = client.get("/catalog/public")
    duration = time.time() - start_time
    
    assert response.status_code == 200
    print(f"Fetch 100+ products took {duration:.4f}s")
    assert duration < 1.0 # Should be fast
