import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.api import deps
from app.models.user import Base, User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit
from app.models.warehouse import Warehouse
from app.models.location_models import StorageLocation, LocationType
from app.models.product_location_models import ProductLocationAssignment
from app.core.security import create_access_token

# Setup in-memory DB for testing
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

@pytest.fixture(scope="module")
def token(db):
    # Ensure role exists (check if already created by other tests sharing DB if running in parallel, but here scope is module)
    role = db.query(Role).filter_by(name="admin_prod").first()
    if not role:
        role = Role(name="admin_prod", description="Administrator", level=100)
        db.add(role)
        db.commit()
    
    user = User(
        email="admin_prod@locapi.com", 
        password_hash="hash", 
        full_name="Admin Prod", 
        role_id=role.id, 
        is_active=True
    )
    db.add(user)
    db.commit()
    return create_access_token(subject=str(user.id))

@pytest.fixture(scope="module")
def setup_data(db):
    # Category & Unit
    cat = Category(name="Parts 2", description="Parts 2")
    unit = Unit(name="Item 2", abbreviation="itm2")
    db.add_all([cat, unit])
    db.commit()

    # Warehouse
    wh = Warehouse(code="WH-FILTER", name="Filter Warehouse", created_by=1)
    db.add(wh)
    db.commit()

    # Products
    p1 = Product(sku="P_FILTER_1", name="Product Filter 1", category_id=cat.id, unit_id=unit.id, cost=10, price=20)
    p2 = Product(sku="P_FILTER_2", name="Product Filter 2", category_id=cat.id, unit_id=unit.id, cost=10, price=20)
    db.add_all([p1, p2])
    db.commit()
    
    # Locations
    loc1 = StorageLocation(
        warehouse_id=wh.id,
        code="LOC-F1",
        name="Location Filter 1",
        location_type=LocationType.SHELF,
        barcode="LOC-F1-BAR"
    )
    loc2 = StorageLocation(
        warehouse_id=wh.id,
        code="LOC-F2",
        name="Location Filter 2",
        location_type=LocationType.SHELF,
        barcode="LOC-F2-BAR"
    )
    db.add_all([loc1, loc2])
    db.commit()

    # Assign Product 1 to Location 1
    assign1 = ProductLocationAssignment(
        product_id=p1.id,
        location_id=loc1.id,
        warehouse_id=wh.id,
        quantity=10,
        assigned_by=1
    )
    db.add(assign1)
    db.commit()

    return {"p1_id": p1.id, "p2_id": p2.id, "loc1_id": loc1.id, "loc2_id": loc2.id}

def test_get_products_filtered_by_location(client, token, setup_data):
    p1_id = setup_data["p1_id"]
    p2_id = setup_data["p2_id"]
    loc1_id = setup_data["loc1_id"]
    loc2_id = setup_data["loc2_id"]

    # Test Filter by Location 1 (Should contain P1)
    response = client.get(
        f"/products/?location_id={loc1_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == p1_id

    # Test Filter by Location 2 (Should be empty)
    response = client.get(
        f"/products/?location_id={loc2_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0

    # Test No Filter (Should contain both)
    response = client.get(
        f"/products/?search=P_FILTER",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    # P1 and P2
    ids = [p["id"] for p in data]
    assert p1_id in ids
    assert p2_id in ids
