import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
from app.models.user import Base
from app.models.product import Product, ProductBatch
from app.models.inventory_refs import Category, Unit
from app.core.config import settings

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
    
    # Create required dependencies (Category, Unit)
    category = Category(name="Test Category", description="Category for testing")
    unit = Unit(name="Piece", abbreviation="pc")
    session.add(category)
    session.add(unit)
    session.commit()
    session.refresh(category)
    session.refresh(unit)
    
    yield session
    
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_product_without_batch(db):
    # Get dependencies
    category = db.query(Category).first()
    unit = db.query(Unit).first()
    
    product = Product(
        sku="SKU-001",
        name="Simple Product",
        description="A product without batches",
        category_id=category.id,
        unit_id=unit.id,
        cost=10.0,
        price=20.0,
        min_stock=5,
        target_stock=20,
        has_batch=False,
        has_expiration=False
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    
    assert product.id is not None
    assert product.sku == "SKU-001"
    assert product.has_batch is False
    assert len(product.batches) == 0

def test_create_product_with_batch(db):
    # Get dependencies
    category = db.query(Category).first()
    unit = db.query(Unit).first()
    
    # Create Product
    product = Product(
        sku="SKU-002",
        name="Batch Product",
        description="A product with batches",
        category_id=category.id,
        unit_id=unit.id,
        cost=15.0,
        price=30.0,
        has_batch=True,
        has_expiration=True
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    
    # Create Batch
    batch = ProductBatch(
        product_id=product.id,
        batch_number="BATCH-2023-001",
        manufactured_date=date(2023, 1, 1),
        expiration_date=date(2024, 1, 1),
        quantity=100
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    db.refresh(product) # Refresh product to load relationship
    
    assert product.id is not None
    assert product.sku == "SKU-002"
    assert product.has_batch is True
    assert len(product.batches) == 1
    assert product.batches[0].batch_number == "BATCH-2023-001"
    assert batch.product_id == product.id
