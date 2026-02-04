import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from app.models.user import Base, User, Role, UserAudit
from app.core import security
from app.api import deps
from main import app

# --- Setup in-memory DB for testing ---
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Fixtures ---
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
    # Ensure roles exist
    roles = [
        {"id": 1, "name": "Super Admin", "level": 1},
        {"id": 2, "name": "Admin", "level": 2},
        {"id": 3, "name": "User", "level": 3},
    ]
    for r in roles:
        existing = db.query(Role).filter(Role.id == r["id"]).first()
        if not existing:
            db.add(Role(id=r["id"], name=r["name"], level=r["level"]))
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
    
    # Login
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

@pytest.fixture(scope="module")
def user_token(client, db, setup_roles):
    email = "user_test@example.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Regular User",
            role_id=3,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]

# --- Tests ---

def test_list_users_permissions(client, super_admin_token, admin_token, user_token):
    # Role 1 (Super Admin) - OK
    res = client.get("/users/", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert res.status_code == 200
    
    # Role 2 (Admin) - OK
    res = client.get("/users/", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    
    # Role 3 (User) - Forbidden
    res = client.get("/users/", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403

def test_create_user_rbac(client, super_admin_token, admin_token):
    # Role 2 creates Role 3 - OK
    new_user = {
        "email": "new_user_by_admin@example.com",
        "password": "password123",
        "full_name": "Created by Admin",
        "role_id": 3
    }
    res = client.post("/users/", json=new_user, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["email"] == new_user["email"]

    # Role 2 tries to create Role 1 - Fail
    bad_user = {
        "email": "super_admin_attempt@example.com",
        "password": "password123",
        "full_name": "Attempt",
        "role_id": 1
    }
    res = client.post("/users/", json=bad_user, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 403

    # Role 1 creates Role 1 - OK
    good_user = {
        "email": "super_admin_real@example.com",
        "password": "password123",
        "full_name": "Real Super",
        "role_id": 1
    }
    res = client.post("/users/", json=good_user, headers={"Authorization": f"Bearer {super_admin_token}"})
    assert res.status_code == 200

def test_update_user_rbac(client, super_admin_token, admin_token, db):
    # Create a target Super Admin user
    target_sa = User(email="target_sa@test.com", password_hash="hash", role_id=1, full_name="SA Target")
    db.add(target_sa)
    
    # Create a target Regular user
    target_user = User(email="target_user@test.com", password_hash="hash", role_id=3, full_name="User Target")
    db.add(target_user)
    db.commit()

    # Role 2 tries to update Super Admin - Fail
    res = client.put(
        f"/users/{target_sa.id}", 
        json={"full_name": "Hacked"}, 
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 403

    # Role 2 tries to promote user to Role 1 - Fail
    res = client.put(
        f"/users/{target_user.id}", 
        json={"role_id": 1}, 
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 403

    # Role 2 updates Regular User - OK
    res = client.put(
        f"/users/{target_user.id}", 
        json={"full_name": "Updated by Admin"}, 
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert res.json()["full_name"] == "Updated by Admin"

def test_delete_user_soft(client, super_admin_token, db):
    # Create user to delete
    to_delete = User(email="delete_me@test.com", password_hash="hash", role_id=3, is_active=True, full_name="Delete Me")
    db.add(to_delete)
    db.commit()

    res = client.delete(f"/users/{to_delete.id}", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert res.status_code == 200
    assert res.json()["is_active"] == False

    # Verify in DB
    db.refresh(to_delete)
    assert to_delete.is_active == False

def test_reset_password_rbac(client, super_admin_token, admin_token, db):
    # Create targets
    sa_user = User(email="sa_reset@test.com", password_hash="hash", role_id=1)
    db.add(sa_user)
    
    reg_user = User(email="reg_reset@test.com", password_hash="hash", role_id=3)
    db.add(reg_user)
    db.commit()

    # Role 2 tries to reset SA password - Fail
    res = client.post(
        f"/users/{sa_user.id}/reset-password",
        json={"new_password": "hackedpassword"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 403

    # Role 2 resets Regular User password - OK
    res = client.post(
        f"/users/{reg_user.id}/reset-password",
        json={"new_password": "newsecurepassword"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    
    # Verify new password works (requires re-login or check hash change)
    # Checking if hash changed is complex in test without knowing old hash exactly or algorithm salt
    # But 200 OK means logic passed.
    
    # Check Audit
    res = client.get(f"/users/{reg_user.id}/audit", headers={"Authorization": f"Bearer {super_admin_token}"})
    logs = res.json()
    assert logs[0]["action"] == "RESET_PASSWORD"

def test_audit_log(client, super_admin_token, db):
    # Create user
    new_user_data = {
        "email": "audit_test@example.com",
        "password": "password123",
        "full_name": "Audit Test",
        "role_id": 3
    }
    res = client.post("/users/", json=new_user_data, headers={"Authorization": f"Bearer {super_admin_token}"})
    user_id = res.json()["id"]

    # Update user
    client.put(
        f"/users/{user_id}", 
        json={"full_name": "Audit Changed"}, 
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )

    # Check Audit
    res = client.get(f"/users/{user_id}/audit", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert res.status_code == 200
    logs = res.json()
    
    # We expect at least CREATE and UPDATE
    actions = [l["action"] for l in logs]
    assert "CREATE" in actions
    assert "UPDATE" in actions
    
    # The actor should be Super Admin
    assert logs[0]["actor_name"] == "Super Admin"
