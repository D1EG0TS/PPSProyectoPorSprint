import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from app.models.user import Base, User, Role, UserAudit
from app.models.system import SystemConfig
from app.core import security
from app.api import deps
from main import app
from datetime import datetime, timedelta, timezone

# --- Setup in-memory DB for testing ---
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
    ]
    for r in roles:
        existing = db.query(Role).filter(Role.id == r["id"]).first()
        if not existing:
            db.add(Role(id=r["id"], name=r["name"], level=r["level"]))
    db.commit()

@pytest.fixture(scope="module")
def super_admin_token(client, db, setup_roles):
    email = "superadmin_sys@example.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Super Admin System",
            role_id=1,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def admin_token(client, db, setup_roles):
    email = "admin_sys@example.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Admin System",
            role_id=2,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]

def test_system_config_lifecycle(client, super_admin_token):
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # 1. Create/Update Config
    config_data = {
        "key": "maintenance_mode",
        "value": "true",
        "description": "Enable maintenance mode"
    }
    response = client.put("/system/config", json=config_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["key"] == "maintenance_mode"
    assert data["value"] == "true"
    
    # 2. Get Config
    response = client.get("/system/config", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["key"] == "maintenance_mode"

def test_system_logs_rbac(client, super_admin_token, admin_token):
    # Role 1 Access
    headers_sa = {"Authorization": f"Bearer {super_admin_token}"}
    response = client.get("/system/logs", headers=headers_sa)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    
    # Role 2 Access (Forbidden)
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/system/logs", headers=headers_admin)
    assert response.status_code == 403

def test_system_health_metrics(client, super_admin_token):
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # Health
    response = client.get("/system/health", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "operational"
    
    # Metrics
    response = client.get("/system/metrics", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "active_users" in data

def test_system_cleanup(client, db, super_admin_token):
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # Create old log
    old_date = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=60)
    user = db.query(User).filter(User.email == "superadmin_sys@example.com").first()
    
    log = UserAudit(
        user_id=user.id,
        action="TEST_OLD",
        details="Old log",
        created_at=old_date
    )
    db.add(log)
    db.commit()
    
    # Verify log exists
    assert db.query(UserAudit).filter(UserAudit.action == "TEST_OLD").count() == 1
    
    # Cleanup logs older than 30 days
    response = client.post("/system/cleanup?days=30", headers=headers)
    assert response.status_code == 200
    
    # Verify log deleted
    assert db.query(UserAudit).filter(UserAudit.action == "TEST_OLD").count() == 0
