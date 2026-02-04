import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
from app.models.user import Base, User
from app.models.product import Product, ProductBatch
from app.models.inventory_refs import Category, Unit
from app.models.warehouse import Warehouse
from app.models.movement import MovementRequest, MovementRequestItem, Movement, MovementType, MovementStatus

# Setup in-memory DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Create required dependencies
    # 1. User
    user = User(email="test@example.com", password_hash="hashed_password", full_name="Test User", is_active=True)
    session.add(user)
    session.commit() # Commit to get ID
    
    # 2. Category & Unit
    category = Category(name="Test Category", description="Category for testing")
    unit = Unit(name="Piece", abbreviation="pc")
    session.add(category)
    session.add(unit)
    
    # 3. Warehouse
    warehouse = Warehouse(code="WH-001", name="Main Warehouse", created_by=user.id)
    session.add(warehouse)
    
    session.commit()
    session.refresh(user)
    session.refresh(category)
    session.refresh(unit)
    session.refresh(warehouse)
    
    yield session
    
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_movement_request_with_items(db):
    # Get dependencies
    user = db.query(User).first()
    warehouse = db.query(Warehouse).first()
    category = db.query(Category).first()
    unit = db.query(Unit).first()
    
    # Create Product
    product = Product(
        sku="MOV-PROD-001",
        name="Movement Product",
        category_id=category.id,
        unit_id=unit.id,
        cost=100.0,
        price=150.0
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    
    # Create Movement Request (IN)
    request = MovementRequest(
        type=MovementType.IN,
        status=MovementStatus.DRAFT,
        requested_by=user.id,
        destination_warehouse_id=warehouse.id, # Incoming to warehouse
        reason="Initial Stock",
        reference="PO-12345"
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    
    # Add Items
    item1 = MovementRequestItem(
        request_id=request.id,
        product_id=product.id,
        quantity=50,
        notes="First batch"
    )
    db.add(item1)
    db.commit()
    
    # Refresh request to check items relationship
    db.refresh(request)
    
    assert request.id is not None
    assert request.type == MovementType.IN
    assert request.status == MovementStatus.DRAFT
    assert len(request.items) == 1
    assert request.items[0].product_id == product.id
    assert request.items[0].quantity == 50
    assert request.destination_warehouse_id == warehouse.id

def test_movement_ledger_entry(db):
    # Use existing data
    user = db.query(User).first()
    warehouse = db.query(Warehouse).first()
    product = db.query(Product).first()
    request = db.query(MovementRequest).first()
    
    # Create Ledger Movement
    movement = Movement(
        movement_request_id=request.id,
        type=MovementType.IN,
        product_id=product.id,
        warehouse_id=warehouse.id,
        quantity=50,
        previous_balance=0,
        new_balance=50
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    
    assert movement.id is not None
    assert movement.type == MovementType.IN
    assert movement.quantity == 50
    assert movement.new_balance == 50
    assert movement.request.id == request.id

def test_movement_request_status_transition(db):
    request = db.query(MovementRequest).first()
    
    # Update Status
    request.status = MovementStatus.APPROVED
    db.commit()
    db.refresh(request)
    
    assert request.status == MovementStatus.APPROVED
