import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base
from app.models.user import User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit
from app.models.warehouse import Warehouse
from app.models.location_models import StorageLocation
from app.models.product_location_models import ProductLocationAssignment
from app.models.movement import MovementRequest, MovementType
from app.models.ledger import LedgerEntry, LedgerEntryType
from app.core import security
from app.api import deps
from main import app
from datetime import datetime


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
    with TestClient(app) as c:
        yield c
    del app.dependency_overrides[deps.get_db]


@pytest.fixture(scope="module")
def setup_roles(db: Session):
    roles = [
        {"id": 1, "name": "Super Admin", "level": 1},
        {"id": 2, "name": "Admin", "level": 2},
        {"id": 3, "name": "User", "level": 3},
        {"id": 4, "name": "Manager", "level": 2},
    ]
    for r in roles:
        existing = db.query(Role).filter(Role.id == r["id"]).first()
        if not existing:
            db.add(Role(id=r["id"], name=r["name"], level=r["level"]))
    
    if not db.query(Category).filter(Category.id == 1).first():
        db.add(Category(id=1, name="Test Category", description="Test"))
    
    if not db.query(Unit).filter(Unit.id == 1).first():
        db.add(Unit(id=1, name="Piece", abbreviation="pc"))
        
    db.commit()


@pytest.fixture(scope="module")
def super_admin_token(client, db, setup_roles):
    email = "superadmin_test@example.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Super Admin",
            role_id=1,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token(client, db, setup_roles):
    email = "admin_test@example.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Admin",
            role_id=2,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


@pytest.fixture
def test_warehouses(db):
    warehouses = [
        Warehouse(id=1, code="WH-01", name="Warehouse 1", location="Location 1", is_active=True),
        Warehouse(id=2, code="WH-02", name="Warehouse 2", location="Location 2", is_active=True),
    ]
    for wh in warehouses:
        existing = db.query(Warehouse).filter(Warehouse.id == wh.id).first()
        if not existing:
            db.add(wh)
    db.commit()
    return warehouses


@pytest.fixture
def test_locations(db, test_warehouses):
    locations = [
        StorageLocation(id=1, code="A-01-01", name="Location 1", warehouse_id=1, is_restricted=False, capacity=100),
        StorageLocation(id=2, code="A-01-02", name="Location 2", warehouse_id=1, is_restricted=False, capacity=100),
        StorageLocation(id=3, code="B-01-01", name="Location 3", warehouse_id=2, is_restricted=False, capacity=100),
    ]
    for loc in locations:
        existing = db.query(StorageLocation).filter(StorageLocation.id == loc.id).first()
        if not existing:
            db.add(loc)
    db.commit()
    return locations


@pytest.fixture
def test_product(db, test_locations):
    product = db.query(Product).filter(Product.id == 1).first()
    if not product:
        product = Product(
            id=1,
            name="Test Product",
            sku="TEST-001",
            barcode="1234567890",
            category_id=1,
            unit_id=1,
            min_stock=10,
            has_batch=False,
            has_expiration=False,
            is_active=True
        )
        db.add(product)
        db.commit()
        db.refresh(product)
    return product


@pytest.fixture
def test_stock(db, test_product, test_warehouses, test_locations):
    ledger_entry = LedgerEntry(
        movement_request_id=None,
        product_id=test_product.id,
        warehouse_id=1,
        location_id=1,
        entry_type=LedgerEntryType.INCREMENT,
        quantity=100,
        previous_balance=0,
        new_balance=100,
        applied_by=1
    )
    db.add(ledger_entry)
    db.commit()
    return ledger_entry


class TestInventoryScan:
    """Tests for POST /inventory/scan endpoint"""
    
    def test_scan_product_by_sku(self, client, super_admin_token, test_product, test_stock):
        response = client.post(
            "/inventory/scan",
            json={"code": "TEST-001"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["sku"] == "TEST-001"
        assert data["current_stock"] == 100

    def test_scan_product_by_barcode(self, client, super_admin_token, test_product, test_stock):
        response = client.post(
            "/inventory/scan",
            json={"code": "1234567890"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["barcode"] == "1234567890"

    def test_scan_not_found(self, client, super_admin_token):
        response = client.post(
            "/inventory/scan",
            json={"code": "NONEXISTENT"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["found"] is False

    def test_scan_unauthorized(self, client):
        response = client.post(
            "/inventory/scan",
            json={"code": "TEST-001"}
        )
        assert response.status_code == 401


class TestInventoryReceive:
    """Tests for POST /inventory/receive endpoint"""
    
    def test_receive_merchandise(self, client, super_admin_token, test_product, test_warehouses):
        response = client.post(
            "/inventory/receive",
            json={
                "warehouse_id": 1,
                "items": [
                    {"product_id": 1, "quantity": 50}
                ],
                "reference": "OC-TEST-001"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["items_received"] == 1
        assert "IN-" in data["request_number"]

    def test_receive_invalid_warehouse(self, client, super_admin_token, test_product):
        response = client.post(
            "/inventory/receive",
            json={
                "warehouse_id": 999,
                "items": [
                    {"product_id": 1, "quantity": 50}
                ]
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 404

    def test_receive_invalid_product(self, client, super_admin_token, test_warehouses):
        response = client.post(
            "/inventory/receive",
            json={
                "warehouse_id": 1,
                "items": [
                    {"product_id": 999, "quantity": 50}
                ]
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 404


class TestInventoryAdjust:
    """Tests for POST /inventory/adjust endpoint"""
    
    def test_create_adjustment_increase(self, client, super_admin_token, test_product, test_warehouses, test_stock):
        response = client.post(
            "/inventory/adjust",
            json={
                "items": [
                    {
                        "product_id": 1,
                        "warehouse_id": 1,
                        "quantity": 10,
                        "reason": "CORRECTION"
                    }
                ]
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["adjustments_count"] == 1
        assert "ADJ-" in data["request_number"]

    def test_create_adjustment_decrease(self, client, super_admin_token, test_product, test_warehouses, test_stock):
        response = client.post(
            "/inventory/adjust",
            json={
                "items": [
                    {
                        "product_id": 1,
                        "warehouse_id": 1,
                        "quantity": -5,
                        "reason": "DAMAGE",
                        "notes": "Test damage"
                    }
                ]
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_adjustment_empty_items(self, client, super_admin_token, test_warehouses):
        response = client.post(
            "/inventory/adjust",
            json={"items": []},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400


class TestInventoryTransfer:
    """Tests for POST /inventory/transfer endpoint"""
    
    def test_create_transfer(self, client, super_admin_token, test_product, test_warehouses, test_locations, test_stock):
        response = client.post(
            "/inventory/transfer",
            json={
                "source_warehouse_id": 1,
                "destination_warehouse_id": 2,
                "items": [
                    {
                        "product_id": 1,
                        "quantity": 20,
                        "source_location_id": 1
                    }
                ],
                "notes": "Test transfer"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["items_transferred"] == 1
        assert "TR-" in data["request_number"]

    def test_transfer_same_warehouse_error(self, client, super_admin_token, test_product, test_warehouses, test_stock):
        response = client.post(
            "/inventory/transfer",
            json={
                "source_warehouse_id": 1,
                "destination_warehouse_id": 1,
                "items": [
                    {"product_id": 1, "quantity": 20}
                ]
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400
        assert "different" in response.json()["detail"].lower()

    def test_transfer_insufficient_stock(self, client, super_admin_token, test_product, test_warehouses, test_stock):
        response = client.post(
            "/inventory/transfer",
            json={
                "source_warehouse_id": 1,
                "destination_warehouse_id": 2,
                "items": [
                    {"product_id": 1, "quantity": 999}
                ]
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400
        assert "insufficient" in response.json()["detail"].lower()

    def test_transfer_empty_items(self, client, super_admin_token, test_warehouses):
        response = client.post(
            "/inventory/transfer",
            json={
                "source_warehouse_id": 1,
                "destination_warehouse_id": 2,
                "items": []
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400


class TestInventoryWarehouses:
    """Tests for warehouse and location endpoints"""
    
    def test_get_warehouses(self, client, super_admin_token, test_warehouses):
        response = client.get(
            "/inventory/warehouses",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

    def test_get_available_locations(self, client, super_admin_token, test_warehouses, test_locations):
        response = client.get(
            "/inventory/locations/available",
            params={"warehouse_id": 1},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    def test_get_product_locations(self, client, super_admin_token, test_product, test_locations, test_stock):
        response = client.get(
            "/inventory/product/1/locations",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestInventoryAdjustments:
    """Tests for GET /inventory/adjustments endpoint"""
    
    def test_get_adjustment_history(self, client, super_admin_token, test_product, test_warehouses, test_stock):
        client.post(
            "/inventory/adjust",
            json={
                "items": [
                    {"product_id": 1, "warehouse_id": 1, "quantity": 5, "reason": "CORRECTION"}
                ]
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        response = client.get(
            "/inventory/adjustments",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "adjustments" in data
        assert "total" in data
        assert data["page"] == 1
        assert data["page_size"] == 20


class TestInventoryCapacity:
    """Tests for location capacity endpoints"""
    
    def test_get_location_capacity(self, client, super_admin_token, test_locations, test_stock):
        response = client.get(
            "/inventory/locations/1/capacity",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert "capacity" in data
        assert "available" in data

    def test_update_location_capacity(self, client, super_admin_token, test_locations):
        response = client.put(
            "/inventory/locations/1/capacity",
            json={"capacity": 150},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["capacity"] == 150


class TestCycleCount:
    """Tests for cycle count endpoints"""
    
    def test_create_cycle_count(self, client, super_admin_token, test_warehouses, test_locations, test_stock):
        response = client.post(
            "/inventory/cycle-count",
            json={
                "warehouse_id": 1,
                "priority": "NORMAL",
                "notes": "Test cycle count"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "CC-" in data["request_number"]
        assert data["warehouse_id"] == 1
        assert data["total_items"] >= 0

    def test_list_cycle_counts(self, client, super_admin_token, test_warehouses, test_locations, test_stock):
        client.post(
            "/inventory/cycle-count",
            json={"warehouse_id": 1},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        response = client.get(
            "/inventory/cycle-count",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "counts" in data
        assert "total" in data
        assert data["page"] == 1

    def test_get_cycle_count_detail(self, client, super_admin_token, test_warehouses, test_locations, test_stock):
        create_response = client.post(
            "/inventory/cycle-count",
            json={"warehouse_id": 1},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        count_id = create_response.json()["id"]
        
        response = client.get(
            f"/inventory/cycle-count/{count_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == count_id
        assert "items" in data

    def test_record_count(self, client, super_admin_token, test_warehouses, test_locations, test_stock):
        create_response = client.post(
            "/inventory/cycle-count",
            json={"warehouse_id": 1},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        count_id = create_response.json()["id"]
        
        detail_response = client.get(
            f"/inventory/cycle-count/{count_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        items = detail_response.json()["items"]
        
        if items:
            item_id = items[0]["id"]
            response = client.post(
                f"/inventory/cycle-count/{count_id}/record",
                json={
                    "item_id": item_id,
                    "counted_stock": 50,
                    "notes": "Test count"
                },
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

    def test_complete_cycle_count(self, client, super_admin_token, test_warehouses, test_locations, test_stock):
        create_response = client.post(
            "/inventory/cycle-count",
            json={"warehouse_id": 1},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        count_id = create_response.json()["id"]
        
        response = client.post(
            f"/inventory/cycle-count/{count_id}/complete",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200


class TestInventoryReports:
    """Tests for inventory report endpoints"""
    
    def test_get_expiring_products(self, client, super_admin_token, test_warehouses):
        response = client.get(
            "/inventory/reports/expiring",
            params={"days_ahead": 30, "include_expired": True},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert "expired_count" in data
        assert "expiring_soon_count" in data
        assert isinstance(data["products"], list)

    def test_get_expiring_products_with_warehouse_filter(self, client, super_admin_token, test_warehouses):
        response = client.get(
            "/inventory/reports/expiring",
            params={"warehouse_id": 1, "days_ahead": 30},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "products" in data

    def test_get_expiring_products_pagination(self, client, super_admin_token, test_warehouses):
        response = client.get(
            "/inventory/reports/expiring",
            params={"page": 1, "page_size": 10},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["products"]) <= 10

    def test_get_low_stock_products(self, client, super_admin_token, test_warehouses, test_product):
        response = client.get(
            "/inventory/reports/low-stock",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert "critical_count" in data
        assert "warning_count" in data
        assert isinstance(data["products"], list)

    def test_get_low_stock_products_with_warehouse_filter(self, client, super_admin_token, test_warehouses, test_product):
        response = client.get(
            "/inventory/reports/low-stock",
            params={"warehouse_id": 1},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "products" in data

    def test_get_low_stock_products_pagination(self, client, super_admin_token, test_warehouses, test_product):
        response = client.get(
            "/inventory/reports/low-stock",
            params={"page": 1, "page_size": 5},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["products"]) <= 5

    def test_get_inventory_summary(self, client, super_admin_token, test_warehouses, test_product):
        response = client.get(
            "/inventory/reports/summary",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_products" in data
        assert "total_stock" in data
        assert "low_stock_count" in data
        assert "expiring_soon_count" in data
        assert "out_of_stock_count" in data
        assert "by_category" in data
        assert "by_warehouse" in data
        assert isinstance(data["by_category"], list)
        assert isinstance(data["by_warehouse"], list)

    def test_get_inventory_summary_with_warehouse_filter(self, client, super_admin_token, test_warehouses, test_product):
        response = client.get(
            "/inventory/reports/summary",
            params={"warehouse_id": 1},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_products" in data

    def test_report_requires_authentication(self, client):
        response = client.get("/inventory/reports/expiring")
        assert response.status_code == 401

    def test_report_unauthorized_role(self, client, db, setup_roles):
        email = "visitor_test@example.com"
        password = "password123"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                password_hash=security.get_password_hash(password),
                full_name="Visitor",
                role_id=5,
                is_active=True
            )
            db.add(user)
            db.commit()
        
        res = client.post("/auth/login", data={"username": email, "password": password})
        token = res.json()["access_token"]
        
        response = client.get(
            "/inventory/reports/expiring",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
