import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import Base, User, Role
from app.core.config import settings

# Usar una base de datos en memoria o de prueba si fuera necesario.
# Por simplicidad en este sprint, usaremos la conexión configurada pero ten cuidado en producción.
# Idealmente usar SQLITE en memoria para tests rápidos.
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_role_and_user(db):
    # 1. Crear Role
    role = Role(name="admin", description="Administrator", level=10)
    db.add(role)
    db.commit()
    db.refresh(role)
    
    assert role.id is not None
    assert role.name == "admin"

    # 2. Crear User asignado al Role
    user = User(
        email="test@example.com",
        password_hash="hashed_secret",
        full_name="Test User",
        role_id=role.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.role_id == role.id
    assert user.role.name == "admin"
