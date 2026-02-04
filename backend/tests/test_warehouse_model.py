import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import Base, User, Role
from app.models.warehouse import Warehouse, Location
from app.core.config import settings

# Setup in-memory DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def test_user(db_session):
    # Create Role
    role = Role(name="Admin", description="Administrator role", level=1)
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)

    # Create User
    user = User(
        email="warehouse_test@example.com",
        password_hash="hashed_secret",
        full_name="Warehouse Tester",
        role_id=role.id,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_create_warehouse_with_locations(db_session, test_user):
    # Create a warehouse
    warehouse = Warehouse(
        code="WH001",
        name="Main Warehouse",
        location="123 Main St",
        created_by=test_user.id
    )
    db_session.add(warehouse)
    db_session.commit()
    db_session.refresh(warehouse)

    assert warehouse.id is not None
    assert warehouse.code == "WH001"

    # Create root location (Zone A)
    zone_a = Location(
        warehouse_id=warehouse.id,
        code="ZONE-A",
        name="Zone A",
        path="/ZONE-A"
    )
    db_session.add(zone_a)
    db_session.commit()
    db_session.refresh(zone_a)

    assert zone_a.id is not None
    assert zone_a.warehouse_id == warehouse.id

    # Create nested location (Shelf 1 inside Zone A)
    shelf_1 = Location(
        warehouse_id=warehouse.id,
        parent_location_id=zone_a.id,
        code="SHELF-1",
        name="Shelf 1",
        path="/ZONE-A/SHELF-1"
    )
    db_session.add(shelf_1)
    db_session.commit()
    db_session.refresh(shelf_1)

    assert shelf_1.parent_location_id == zone_a.id
    assert shelf_1.path == "/ZONE-A/SHELF-1"

    # Test hierarchy relationship
    db_session.refresh(zone_a)
    assert len(zone_a.children) == 1
    assert zone_a.children[0].id == shelf_1.id
    assert shelf_1.parent.id == zone_a.id

def test_warehouse_code_uniqueness(db_session, test_user):
    warehouse1 = Warehouse(
        code="WH-UNIQUE",
        name="Warehouse 1",
        created_by=test_user.id
    )
    db_session.add(warehouse1)
    db_session.commit()

    warehouse2 = Warehouse(
        code="WH-UNIQUE",
        name="Warehouse 2",
        created_by=test_user.id
    )
    db_session.add(warehouse2)
    
    with pytest.raises(Exception): # IntegrityError
        db_session.commit()
    
    db_session.rollback()

def test_location_code_unique_per_warehouse(db_session, test_user):
    warehouse = Warehouse(
        code="WH-LOC-TEST",
        name="Warehouse Loc Test",
        created_by=test_user.id
    )
    db_session.add(warehouse)
    db_session.commit()

    loc1 = Location(
        warehouse_id=warehouse.id,
        code="LOC-1",
        name="Location 1"
    )
    db_session.add(loc1)
    db_session.commit()

    # Same code in same warehouse should fail
    loc2 = Location(
        warehouse_id=warehouse.id,
        code="LOC-1",
        name="Location 2"
    )
    db_session.add(loc2)

    with pytest.raises(Exception): # IntegrityError
        db_session.commit()
    
    db_session.rollback()
