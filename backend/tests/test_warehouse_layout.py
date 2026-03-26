import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base
from app.models.user import User, Role
from app.models.warehouse import Warehouse
from app.models.warehouse_layout import WarehouseLayout, LayoutCell, CellType, OccupancyLevel
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
    
    if not db.query(Warehouse).filter(Warehouse.id == 1).first():
        warehouse = Warehouse(
            id=1,
            code="TEST-WH",
            name="Test Warehouse",
            location="Test Location",
            is_active=True,
            created_by=1
        )
        db.add(warehouse)
    
    db.commit()


@pytest.fixture(scope="module")
def super_admin_token(client, db, setup_base):
    email = "layout_admin@test.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Layout Admin",
            role_id=1,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token(client, db, setup_base):
    email = "layout_admin2@test.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Layout Admin 2",
            role_id=2,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def user_token(client, db, setup_base):
    email = "layout_user@test.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Layout User",
            role_id=3,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


@pytest.fixture
def created_layout_id(client, super_admin_token):
    response = client.post(
        "/inventory/layout/",
        headers={"Authorization": f"Bearer {super_admin_token}"},
        json={
            "warehouse_id": 1,
            "name": "Test Layout",
            "description": "Test Description",
            "grid_rows": 5,
            "grid_cols": 5,
            "cell_width": 100,
            "cell_height": 100
        }
    )
    return response.json()["id"]


class TestWarehouseLayoutCreate:
    def test_create_layout_super_admin(self, client, super_admin_token):
        response = client.post(
            "/inventory/layout/",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "warehouse_id": 1,
                "name": "New Layout",
                "grid_rows": 10,
                "grid_cols": 10
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Layout"
        assert data["grid_rows"] == 10
        assert data["grid_cols"] == 10
        assert data["is_active"] == True

    def test_create_layout_admin(self, client, admin_token):
        response = client.post(
            "/inventory/layout/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "warehouse_id": 1,
                "name": "Admin Layout",
                "grid_rows": 8,
                "grid_cols": 8
            }
        )
        assert response.status_code == 201

    def test_create_layout_user_forbidden(self, client, user_token):
        response = client.post(
            "/inventory/layout/",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "warehouse_id": 1,
                "name": "User Layout"
            }
        )
        assert response.status_code == 403

    def test_create_duplicate_layout(self, client, super_admin_token, created_layout_id):
        response = client.post(
            "/inventory/layout/",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "warehouse_id": 1,
                "name": "Duplicate Layout"
            }
        )
        assert response.status_code == 400


class TestWarehouseLayoutGet:
    def test_list_layouts(self, client, super_admin_token):
        response = client.get(
            "/inventory/layout/",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_layout_by_id(self, client, super_admin_token, created_layout_id):
        response = client.get(
            f"/inventory/layout/{created_layout_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_layout_id
        assert "cells" in data

    def test_get_layout_by_warehouse(self, client, super_admin_token, created_layout_id):
        response = client.get(
            "/inventory/layout/warehouse/1",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200

    def test_get_nonexistent_layout(self, client, super_admin_token):
        response = client.get(
            "/inventory/layout/99999",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 404


class TestWarehouseLayoutUpdate:
    def test_update_layout(self, client, super_admin_token, created_layout_id):
        response = client.put(
            f"/inventory/layout/{created_layout_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "name": "Updated Layout",
                "grid_rows": 15
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Layout"
        assert data["grid_rows"] == 15

    def test_update_layout_user_forbidden(self, client, user_token, created_layout_id):
        response = client.put(
            f"/inventory/layout/{created_layout_id}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"name": "Hacked Layout"}
        )
        assert response.status_code == 403


class TestWarehouseLayoutDelete:
    def test_delete_layout_super_admin(self, client, super_admin_token):
        create_response = client.post(
            "/inventory/layout/",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "warehouse_id": 1,
                "name": "To Delete Layout"
            }
        )
        layout_id = create_response.json()["id"]
        
        response = client.delete(
            f"/inventory/layout/{layout_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200

    def test_delete_layout_admin_forbidden(self, client, admin_token, created_layout_id):
        response = client.delete(
            f"/inventory/layout/{created_layout_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 403


class TestLayoutCells:
    def test_create_cell(self, client, super_admin_token, created_layout_id):
        response = client.post(
            f"/inventory/layout/{created_layout_id}/cells",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "row": 0,
                "col": 0,
                "x": 0,
                "y": 0,
                "width": 100,
                "height": 100,
                "cell_type": "storage",
                "name": "Cell 1"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["row"] == 0
        assert data["col"] == 0
        assert data["cell_type"] == "storage"

    def test_create_duplicate_cell(self, client, super_admin_token, created_layout_id):
        client.post(
            f"/inventory/layout/{created_layout_id}/cells",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "row": 1,
                "col": 1,
                "x": 100,
                "y": 100,
                "width": 100,
                "height": 100,
                "cell_type": "empty"
            }
        )
        response = client.post(
            f"/inventory/layout/{created_layout_id}/cells",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "row": 1,
                "col": 1,
                "x": 100,
                "y": 100,
                "width": 100,
                "height": 100,
                "cell_type": "empty"
            }
        )
        assert response.status_code == 400

    def test_list_cells(self, client, super_admin_token, created_layout_id):
        response = client.get(
            f"/inventory/layout/{created_layout_id}/cells",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_cells_batch(self, client, super_admin_token, created_layout_id):
        cells = [
            {
                "row": 2,
                "col": i,
                "x": i * 100,
                "y": 200,
                "width": 100,
                "height": 100,
                "cell_type": "rack"
            }
            for i in range(3)
        ]
        response = client.post(
            f"/inventory/layout/{created_layout_id}/cells/batch",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json=cells
        )
        assert response.status_code == 200
        assert len(response.json()) == 3

    def test_update_cell(self, client, super_admin_token, created_layout_id):
        create_response = client.post(
            f"/inventory/layout/{created_layout_id}/cells",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "row": 3,
                "col": 3,
                "x": 300,
                "y": 300,
                "width": 100,
                "height": 100,
                "cell_type": "empty"
            }
        )
        cell_id = create_response.json()["id"]
        
        response = client.put(
            f"/inventory/layout/{created_layout_id}/cells/{cell_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "cell_type": "storage",
                "name": "Updated Cell",
                "color": "#FF0000"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["cell_type"] == "storage"
        assert data["name"] == "Updated Cell"

    def test_delete_cell(self, client, super_admin_token, created_layout_id):
        create_response = client.post(
            f"/inventory/layout/{created_layout_id}/cells",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "row": 4,
                "col": 4,
                "x": 400,
                "y": 400,
                "width": 100,
                "height": 100,
                "cell_type": "empty"
            }
        )
        cell_id = create_response.json()["id"]
        
        response = client.delete(
            f"/inventory/layout/{created_layout_id}/cells/{cell_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200


class TestLayoutGeneration:
    def test_generate_empty_layout(self, client, super_admin_token, created_layout_id):
        response = client.post(
            f"/inventory/layout/{created_layout_id}/generate",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "rows": 3,
                "cols": 3,
                "cell_width": 50,
                "cell_height": 50
            }
        )
        assert response.status_code == 200
        cells = response.json()
        assert len(cells) == 9


class TestLayoutHeatmap:
    def test_get_heatmap(self, client, super_admin_token, created_layout_id):
        client.post(
            f"/inventory/layout/{created_layout_id}/generate",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"rows": 5, "cols": 5}
        )
        
        response = client.get(
            f"/inventory/layout/{created_layout_id}/heatmap",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "cells" in data
        assert "average_occupancy" in data
        assert "total_capacity" in data


class TestLayoutExportImport:
    def test_export_layout(self, client, super_admin_token, created_layout_id):
        client.post(
            f"/inventory/layout/{created_layout_id}/cells",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "row": 0,
                "col": 0,
                "x": 0,
                "y": 0,
                "width": 100,
                "height": 100,
                "cell_type": "storage",
                "name": "Exported Cell"
            }
        )
        
        response = client.get(
            f"/inventory/layout/{created_layout_id}/export",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "cells" in data
        assert "exported_at" in data
        assert data["name"] == "Test Layout"

    def test_import_layout(self, client, super_admin_token, created_layout_id):
        export_response = client.get(
            f"/inventory/layout/{created_layout_id}/export",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        export_data = export_response.json()
        
        response = client.post(
            f"/inventory/layout/{created_layout_id}/generate",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={"rows": 2, "cols": 2}
        )
        assert response.status_code == 200
