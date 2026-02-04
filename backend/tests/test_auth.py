from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.core import security
from main import app
import pytest
import uuid

client = TestClient(app)

def test_register_user():
    email = f"newuser_{uuid.uuid4()}@example.com"
    response = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "newpassword123",
            "full_name": "New User"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == email
    assert "id" in data
    assert "role" in data # El usuario debería tener el rol asignado

def test_login_user():
    # Primero registrar
    email = f"loginuser_{uuid.uuid4()}@example.com"
    password = "loginpassword123"
    client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Login User"
        }
    )
    
    # Intentar login
    response = client.post(
        "/auth/login",
        data={
            "username": email,
            "password": password
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def test_refresh_token():
    # Registrar y loguear
    email = f"refreshuser_{uuid.uuid4()}@example.com"
    password = "refreshpassword123"
    client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Refresh User"}
    )
    login_res = client.post(
        "/auth/login",
        data={"username": email, "password": password}
    )
    refresh_token = login_res.json()["refresh_token"]
    
    # Refrescar
    response = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_login_invalid_credentials():
    response = client.post(
        "/auth/login",
        data={
            "username": "wrong@example.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 400
