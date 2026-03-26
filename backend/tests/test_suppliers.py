import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.supplier import Supplier, SupplierStatus, SupplierCategory
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, PurchaseOrderPriority
from app.models.user import User
import time

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_suppliers.db"
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
def test_user(db):
    user = User(
        id=1,
        username="testuser",
        email="test@example.com",
        hashed_password="hashed",
        role_id=1,
        is_active=True,
        created_at=int(time.time())
    )
    db.add(user)
    db.commit()
    return user


class TestSupplierModel:
    def test_create_supplier(self, db, test_user):
        supplier = Supplier(
            name="Test Supplier",
            code="SUP001",
            contact_person="John Doe",
            email="john@test.com",
            phone="1234567890",
            status=SupplierStatus.ACTIVE,
            category=SupplierCategory.RAW_MATERIALS,
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(supplier)
        db.commit()
        
        assert supplier.id is not None
        assert supplier.name == "Test Supplier"
        assert supplier.code == "SUP001"
        assert supplier.status == SupplierStatus.ACTIVE
        assert supplier.is_active is True

    def test_supplier_unique_code(self, db, test_user):
        supplier1 = Supplier(
            name="Supplier 1",
            code="SUP001",
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(supplier1)
        db.commit()
        
        supplier2 = Supplier(
            name="Supplier 2",
            code="SUP001",
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(supplier2)
        
        with pytest.raises(Exception):
            db.commit()

    def test_supplier_status_transitions(self, db, test_user):
        supplier = Supplier(
            name="Status Test",
            code="SUP002",
            status=SupplierStatus.PENDING,
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(supplier)
        db.commit()
        
        assert supplier.status == SupplierStatus.PENDING
        
        supplier.status = SupplierStatus.ACTIVE
        db.commit()
        
        assert supplier.status == SupplierStatus.ACTIVE
        
        supplier.status = SupplierStatus.BLOCKED
        db.commit()
        
        assert supplier.status == SupplierStatus.BLOCKED


class TestPurchaseOrderModel:
    def test_create_purchase_order(self, db, test_user):
        supplier = Supplier(
            name="PO Supplier",
            code="SUP003",
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(supplier)
        db.commit()
        
        order = PurchaseOrder(
            order_number="PO000001",
            supplier_id=supplier.id,
            status=PurchaseOrderStatus.DRAFT,
            priority=PurchaseOrderPriority.NORMAL,
            subtotal=1000.00,
            tax_amount=160.00,
            total_amount=1160.00,
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(order)
        db.commit()
        
        assert order.id is not None
        assert order.order_number == "PO000001"
        assert order.status == PurchaseOrderStatus.DRAFT

    def test_purchase_order_items(self, db, test_user):
        supplier = Supplier(
            name="Items Supplier",
            code="SUP004",
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(supplier)
        db.commit()
        
        order = PurchaseOrder(
            order_number="PO000002",
            supplier_id=supplier.id,
            status=PurchaseOrderStatus.DRAFT,
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(order)
        db.flush()
        
        item = PurchaseOrderItem(
            purchase_order_id=order.id,
            product_name="Test Product",
            quantity=10,
            quantity_received=0,
            unit_price=100.00,
            total_price=1000.00,
            created_at=int(time.time())
        )
        db.add(item)
        db.commit()
        
        assert item.id is not None
        assert item.purchase_order_id == order.id
        assert item.quantity == 10

    def test_purchase_order_status_workflow(self, db, test_user):
        supplier = Supplier(
            name="Workflow Supplier",
            code="SUP005",
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(supplier)
        db.commit()
        
        order = PurchaseOrder(
            order_number="PO000003",
            supplier_id=supplier.id,
            status=PurchaseOrderStatus.DRAFT,
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(order)
        db.commit()
        
        assert order.status == PurchaseOrderStatus.DRAFT
        
        order.status = PurchaseOrderStatus.PENDING_APPROVAL
        db.commit()
        assert order.status == PurchaseOrderStatus.PENDING_APPROVAL
        
        order.status = PurchaseOrderStatus.APPROVED
        order.approved_by = test_user.id
        order.approved_at = int(time.time())
        db.commit()
        assert order.status == PurchaseOrderStatus.APPROVED
        
        order.status = PurchaseOrderStatus.SENT
        order.sent_at = int(time.time())
        db.commit()
        assert order.status == PurchaseOrderStatus.SENT

    def test_order_amount_calculation(self, db, test_user):
        supplier = Supplier(
            name="Amount Supplier",
            code="SUP006",
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(supplier)
        db.commit()
        
        order = PurchaseOrder(
            order_number="PO000004",
            supplier_id=supplier.id,
            status=PurchaseOrderStatus.DRAFT,
            subtotal=1000.00,
            tax_amount=160.00,
            shipping_cost=50.00,
            total_amount=1210.00,
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add(order)
        db.commit()
        
        assert order.subtotal == 1000.00
        assert order.tax_amount == 160.00
        assert order.shipping_cost == 50.00
        assert order.total_amount == 1210.00


class TestSupplierQueries:
    def test_list_active_suppliers(self, db, test_user):
        for i in range(5):
            supplier = Supplier(
                name=f"Supplier {i}",
                code=f"SUP0{i}",
                status=SupplierStatus.ACTIVE if i % 2 == 0 else SupplierStatus.INACTIVE,
                created_by=test_user.id,
                created_at=int(time.time())
            )
            db.add(supplier)
        db.commit()
        
        active = db.query(Supplier).filter(
            Supplier.is_active == True,
            Supplier.status == SupplierStatus.ACTIVE
        ).all()
        
        assert len(active) == 3

    def test_search_suppliers(self, db, test_user):
        supplier1 = Supplier(
            name="Acme Corp",
            code="SUP100",
            created_by=test_user.id,
            created_at=int(time.time())
        )
        supplier2 = Supplier(
            name="Beta Inc",
            code="SUP101",
            created_by=test_user.id,
            created_at=int(time.time())
        )
        db.add_all([supplier1, supplier2])
        db.commit()
        
        results = db.query(Supplier).filter(
            Supplier.name.ilike("%acme%")
        ).all()
        
        assert len(results) == 1
        assert results[0].name == "Acme Corp"
