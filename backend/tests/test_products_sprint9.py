import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.product import Product, ProductBatch
from app.models.inventory_refs import Category, Unit, Condition
from app.models.user import User, Role
import time

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_products_sprint9.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_role(db):
    role = Role(id=1, name="Admin", level=50)
    db.add(role)
    db.commit()
    return role


@pytest.fixture
def test_user(db, test_role):
    user = User(
        id=1,
        username="admin",
        email="admin@test.com",
        hashed_password="hashed",
        role_id=1,
        is_active=True,
        created_at=int(time.time())
    )
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def test_category(db):
    category = Category(name="Test Category")
    db.add(category)
    db.commit()
    return category


@pytest.fixture
def test_unit(db):
    unit = Unit(name="Pieza", abbreviation="pza")
    db.add(unit)
    db.commit()
    return unit


@pytest.fixture
def test_condition(db):
    condition = Condition(name="Nuevo", description="Producto nuevo")
    db.add(condition)
    db.commit()
    return condition


@pytest.fixture
def test_product(db, test_category, test_unit):
    product = Product(
        sku="TEST001",
        name="Test Product",
        category_id=test_category.id,
        unit_id=test_unit.id,
        created_at=int(time.time())
    )
    db.add(product)
    db.commit()
    return product


class TestConditionModel:
    def test_create_condition(self, db, test_condition):
        assert test_condition.id is not None
        assert test_condition.name == "Nuevo"
        assert test_condition.is_active is True

    def test_condition_unique_name(self, db):
        condition1 = Condition(name="Unique", description="First")
        db.add(condition1)
        db.commit()
        
        condition2 = Condition(name="Unique", description="Second")
        db.add(condition2)
        
        with pytest.raises(Exception):
            db.commit()

    def test_condition_soft_delete(self, db, test_condition):
        test_condition.is_active = False
        db.commit()
        
        inactive = db.query(Condition).filter(
            Condition.id == test_condition.id,
            Condition.is_active == True
        ).first()
        assert inactive is None


class TestProductCondition:
    def test_product_with_condition(self, db, test_product, test_condition):
        test_product.condition_id = test_condition.id
        db.commit()
        
        db.refresh(test_product)
        assert test_product.condition_id == test_condition.id
        assert test_product.condition.name == "Nuevo"

    def test_product_without_condition(self, db, test_product):
        assert test_product.condition_id is None


class TestBatchOperations:
    def test_create_batch(self, db, test_product):
        batch = ProductBatch(
            product_id=test_product.id,
            batch_number="BATCH001",
            manufactured_date=None,
            expiration_date=None,
            quantity=100
        )
        db.add(batch)
        db.commit()
        
        assert batch.id is not None
        assert batch.batch_number == "BATCH001"
        assert batch.quantity == 100

    def test_batch_with_dates(self, db, test_product):
        from datetime import date
        
        batch = ProductBatch(
            product_id=test_product.id,
            batch_number="BATCH002",
            manufactured_date=date(2024, 1, 1),
            expiration_date=date(2025, 1, 1),
            quantity=50
        )
        db.add(batch)
        db.commit()
        
        assert batch.manufactured_date == date(2024, 1, 1)
        assert batch.expiration_date == date(2025, 1, 1)

    def test_batch_update(self, db, test_product):
        batch = ProductBatch(
            product_id=test_product.id,
            batch_number="BATCH003",
            quantity=100
        )
        db.add(batch)
        db.commit()
        
        batch.batch_number = "BATCH003_UPDATED"
        batch.quantity = 150
        db.commit()
        
        db.refresh(batch)
        assert batch.batch_number == "BATCH003_UPDATED"
        assert batch.quantity == 150

    def test_batch_update_dates(self, db, test_product):
        from datetime import date
        
        batch = ProductBatch(
            product_id=test_product.id,
            batch_number="BATCH004",
            quantity=100
        )
        db.add(batch)
        db.commit()
        
        batch.manufactured_date = date(2024, 6, 1)
        batch.expiration_date = date(2025, 6, 1)
        db.commit()
        
        db.refresh(batch)
        assert batch.manufactured_date == date(2024, 6, 1)
        assert batch.expiration_date == date(2025, 6, 1)

    def test_batch_delete(self, db, test_product):
        batch = ProductBatch(
            product_id=test_product.id,
            batch_number="BATCH005",
            quantity=0
        )
        db.add(batch)
        db.commit()
        batch_id = batch.id
        
        db.delete(batch)
        db.commit()
        
        deleted = db.query(ProductBatch).filter(ProductBatch.id == batch_id).first()
        assert deleted is None

    def test_batch_cascade_delete_with_product(self, db, test_product):
        batch = ProductBatch(
            product_id=test_product.id,
            batch_number="BATCH006",
            quantity=100
        )
        db.add(batch)
        db.commit()
        
        product_id = test_product.id
        db.delete(test_product)
        db.commit()
        
        batches = db.query(ProductBatch).filter(ProductBatch.product_id == product_id).all()
        assert len(batches) == 0


class TestProductBatchValidation:
    def test_product_has_batch_flag(self, db, test_product, test_unit, test_category):
        product = Product(
            sku="BATCH_TEST",
            name="Product with batches",
            category_id=test_category.id,
            unit_id=test_unit.id,
            has_batch=True,
            created_at=int(time.time())
        )
        db.add(product)
        db.commit()
        
        assert product.has_batch is True
        
        batch = ProductBatch(
            product_id=product.id,
            batch_number="BT001",
            quantity=100
        )
        db.add(batch)
        db.commit()
        
        assert len(product.batches) == 1

    def test_product_has_expiration_flag(self, db, test_product, test_unit, test_category):
        from datetime import date
        
        product = Product(
            sku="EXP_TEST",
            name="Product with expiration",
            category_id=test_category.id,
            unit_id=test_unit.id,
            has_expiration=True,
            created_at=int(time.time())
        )
        db.add(product)
        db.commit()
        
        assert product.has_expiration is True
        
        batch = ProductBatch(
            product_id=product.id,
            batch_number="EXP001",
            expiration_date=date(2025, 12, 31),
            quantity=100
        )
        db.add(batch)
        db.commit()
        
        assert batch.expiration_date == date(2025, 12, 31)
