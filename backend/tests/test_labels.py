import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base
from app.models.user import User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit
from app.models.label import LabelTemplate, LabelType
from app.core import security
from app.api import deps
from main import app
import time


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
def setup_base(db: Session):
    roles = [
        {"id": 1, "name": "Super Admin", "level": 1},
        {"id": 2, "name": "Admin", "level": 2},
        {"id": 3, "name": "User", "level": 3},
    ]
    for r in roles:
        existing = db.query(Role).filter(Role.id == r["id"]).first()
        if not existing:
            db.add(Role(id=r["id"], name=r["name"], level=r["level"]))
    
    if not db.query(Category).filter(Category.id == 1).first():
        db.add(Category(id=1, name="Test Category", description="Test"))
    
    if not db.query(Unit).filter(Unit.id == 1).first():
        db.add(Unit(id=1, name="Piece", abbreviation="pc"))
    
    if not db.query(Product).filter(Product.id == 1).first():
        product = Product(
            id=1,
            sku="TEST-SKU-001",
            name="Test Product",
            barcode="1234567890",
            category_id=1,
            unit_id=1,
            is_active=True
        )
        db.add(product)
    
    db.commit()


@pytest.fixture(scope="module")
def super_admin_token(client, db, setup_base):
    email = "label_admin@test.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Label Admin",
            role_id=1,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token(client, db, setup_base):
    email = "label_admin2@test.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Label Admin 2",
            role_id=2,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def user_token(client, db, setup_base):
    email = "label_user@test.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Label User",
            role_id=3,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


class TestLabelTemplates:
    def test_create_template_super_admin(self, client, super_admin_token):
        response = client.post(
            "/inventory/labels/templates",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "name": "Template Test",
                "label_type": "qr",
                "size": "medium"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Template Test"
        assert data["label_type"] == "qr"

    def test_create_template_admin(self, client, admin_token):
        response = client.post(
            "/inventory/labels/templates",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Admin Template",
                "label_type": "code128"
            }
        )
        assert response.status_code == 201

    def test_create_template_user_forbidden(self, client, user_token):
        response = client.post(
            "/inventory/labels/templates",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"name": "User Template"}
        )
        assert response.status_code == 403

    def test_list_templates(self, client, super_admin_token):
        response = client.get(
            "/inventory/labels/templates",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_template(self, client, super_admin_token):
        create_response = client.post(
            "/inventory/labels/templates",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"name": "Get Test Template", "label_type": "qr"}
        )
        template_id = create_response.json()["id"]
        
        response = client.get(
            f"/inventory/labels/templates/{template_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Get Test Template"

    def test_update_template(self, client, super_admin_token):
        create_response = client.post(
            "/inventory/labels/templates",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"name": "Original Name", "label_type": "qr"}
        )
        template_id = create_response.json()["id"]
        
        response = client.put(
            f"/inventory/labels/templates/{template_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"name": "Updated Name"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    def test_delete_template(self, client, super_admin_token):
        create_response = client.post(
            "/inventory/labels/templates",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"name": "To Delete Template"}
        )
        template_id = create_response.json()["id"]
        
        response = client.delete(
            f"/inventory/labels/templates/{template_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200


class TestLabelGeneration:
    def test_generate_product_label(self, client, super_admin_token):
        response = client.get(
            "/inventory/labels/product/1",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    def test_generate_product_label_with_type(self, client, super_admin_token):
        response = client.get(
            "/inventory/labels/product/1?label_type=code128",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200

    def test_generate_custom_label(self, client, super_admin_token):
        response = client.post(
            "/inventory/labels/generate",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "data": {
                    "product_name": "Custom Product",
                    "sku": "CUST-001",
                    "barcode": "9876543210"
                },
                "label_type": "qr"
            }
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    def test_batch_print(self, client, super_admin_token):
        response = client.post(
            "/inventory/labels/batch-print",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "items": [
                    {"product_name": "Product 1", "sku": "P1"},
                    {"product_name": "Product 2", "sku": "P2"}
                ],
                "copies_per_label": 2
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["label_count"] == 4
