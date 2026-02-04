import pytest
from app.db.seed_database import seed_roles, seed_conditions, seed_units, seed_categories
from app.models import Role, Condition, Unit, Category
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import Base

# Configuración de base de datos en memoria para tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_seeds_idempotency(db):
    # Primera ejecución
    seed_roles(db)
    seed_conditions(db)
    seed_units(db)
    seed_categories(db)
    
    assert db.query(Role).count() == 5
    assert db.query(Condition).count() == 5
    assert db.query(Unit).count() == 5
    assert db.query(Category).count() == 5
    
    # Segunda ejecución (no debería duplicar)
    seed_roles(db)
    seed_conditions(db)
    seed_units(db)
    seed_categories(db)
    
    assert db.query(Role).count() == 5
    assert db.query(Condition).count() == 5
    assert db.query(Unit).count() == 5
    assert db.query(Category).count() == 5
