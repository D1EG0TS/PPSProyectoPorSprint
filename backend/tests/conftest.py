import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from app.models.user import Base, User, Role
from app.models.product import Product
from app.models.inventory_refs import Category, Unit
from app.models.warehouse import Warehouse
from app.core import security
from app.api import deps
from main import app
from datetime import datetime, timezone

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
        {"id": 3, "name": "User", "level": 3},
        {"id": 4, "name": "Manager", "level": 2},
        {"id": 5, "name": "Guest", "level": 3},
    ]
    for r in roles:
        existing = db.query(Role).filter(Role.id == r["id"]).first()
        if not existing:
            db.add(Role(id=r["id"], name=r["name"], level=r["level"]))
    
    # Setup Refs
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

@pytest.fixture(scope="module")
def user_token(client, db, setup_roles):
    email = "user_test@example.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="User",
            role_id=3,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def manager_token(client, db, setup_roles):
    email = "manager_test@example.com"
    password = "password123"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=security.get_password_hash(password),
            full_name="Manager",
            role_id=4,
            is_active=True
        )
        db.add(user)
        db.commit()
    
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]
