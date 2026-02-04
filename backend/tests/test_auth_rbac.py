import pytest
from fastapi.testclient import TestClient
from app.core import security

def test_login_access_token(client: TestClient, db, setup_roles):
    # Create user
    email = "login_test@example.com"
    password = "password123"
    from app.models.user import User
    user = User(email=email, password_hash=security.get_password_hash(password), full_name="Login Test", role_id=3, is_active=True)
    db.add(user)
    db.commit()

    response = client.post("/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

def test_login_wrong_password(client: TestClient, db, setup_roles):
    email = "wrong_pass@example.com"
    password = "password123"
    from app.models.user import User
    user = User(email=email, password_hash=security.get_password_hash(password), full_name="Wrong Pass", role_id=3, is_active=True)
    db.add(user)
    db.commit()

    response = client.post("/auth/login", data={"username": email, "password": "wrongpassword"})
    assert response.status_code == 400

def test_rbac_super_admin_only(client: TestClient, super_admin_token, admin_token, user_token):
    # Assuming /system/logs is Super Admin only (Role 1)
    
    # Super Admin - Should pass (200 OK or empty list)
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    response = client.get("/system/logs", headers=headers)
    assert response.status_code == 200

    # Admin (Role 2) - Should fail
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/system/logs", headers=headers)
    assert response.status_code == 403

    # User (Role 3) - Should fail
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.get("/system/logs", headers=headers)
    assert response.status_code == 403

def test_rbac_admin_routes(client: TestClient, super_admin_token, admin_token, user_token):
    # Assuming /users/ is Admin+ (Role 1, 2)
    
    # Super Admin
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    response = client.get("/users/", headers=headers)
    assert response.status_code == 200

    # Admin
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/users/", headers=headers)
    assert response.status_code == 200

    # User - Should fail
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.get("/users/", headers=headers)
    assert response.status_code == 403
