import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from main import app
from app.api import deps
from app.models.user import Base as UserBase, User, Role
from app.models.integrated_request import Base as RequestBase, IntegratedRequest, IntegratedRequestStatus as RequestStatus
from app.models.tool import Base as ToolBase, Tool, ToolStatus
from app.models.vehicle import Base as VehicleBase, Vehicle, VehicleStatus
from app.models.epp import Base as EPPBase, EPP, EPPStatus
from app.models.product import Base as ProductBase, Product
from app.models.inventory_refs import Base as RefBase, Category, Unit
from app.models.notification import Base as NotifBase
from app.core.security import create_access_token
from datetime import datetime, timedelta

# Setup in-memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    # Create all tables
    # We try to create all, catching errors if they share metadata
    try: UserBase.metadata.create_all(bind=engine)
    except: pass
    try: RequestBase.metadata.create_all(bind=engine)
    except: pass
    try: ToolBase.metadata.create_all(bind=engine)
    except: pass
    try: VehicleBase.metadata.create_all(bind=engine)
    except: pass
    try: EPPBase.metadata.create_all(bind=engine)
    except: pass
    try: ProductBase.metadata.create_all(bind=engine)
    except: pass
    try: RefBase.metadata.create_all(bind=engine)
    except: pass
    try: NotifBase.metadata.create_all(bind=engine)
    except: pass
    
    # Also Condition base if different
    from app.models.inventory_refs import Condition
    try: Condition.metadata.create_all(bind=engine)
    except: pass

    session = TestingSessionLocal()
    
    # Create Role (Admin & Operator)
    role_admin = Role(id=1, name="admin", description="Admin", level=100)
    role_op = Role(id=4, name="operator", description="Operator", level=10) # Role 4 is standard operator
    session.add(role_admin)
    session.add(role_op)
    
    # Create Users
    admin = User(
        email="admin@test.com", 
        password_hash="hash", 
        full_name="Admin User", 
        role_id=1,
        is_active=True
    )
    op = User(
        email="op@test.com", 
        password_hash="hash", 
        full_name="Operator User", 
        role_id=4,
        is_active=True
    )
    session.add(admin)
    session.add(op)
    
    # Create Dependencies (Category, Unit)
    cat = Category(id=1, name="General", description="General")
    unit = Unit(id=1, name="Piece", abbreviation="pc")
    session.add(cat)
    session.add(unit)

    session.commit()
    session.refresh(admin)
    session.refresh(op)
    
    yield session
    
    session.close()
    try: UserBase.metadata.drop_all(bind=engine)
    except: pass

@pytest.fixture(scope="module")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[deps.get_db] = override_get_db
    yield TestClient(app)
    del app.dependency_overrides[deps.get_db]

@pytest.fixture(scope="module")
def admin_token(client, db):
    user = db.query(User).filter(User.email == "admin@test.com").first()
    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def op_token(client, db):
    user = db.query(User).filter(User.email == "op@test.com").first()
    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}"}

def test_g3_integrated_flow(client, db, admin_token, op_token):
    # 1. Setup Data (Tool, Vehicle, EPP)
    # Create Unit and Category first
    from app.models.inventory_refs import Unit, Category, Condition
    
    try:
        unit = Unit(name="Piece", abbreviation="PC")
        db.add(unit)
        db.commit()
    except:
        db.rollback()
        unit = db.query(Unit).filter_by(name="Piece").first()
    
    try:
        category = Category(name="Tools", description="General Tools")
        db.add(category)
        db.commit()
    except:
        db.rollback()
        category = db.query(Category).filter_by(name="Tools").first()
    
    # Create Condition
    try:
        db.add(Condition(id=1, name="GOOD"))
        db.commit()
    except:
        db.rollback()
    
    # Create Product
    product = Product(
        name="Drill G3 Product",
        sku="DRILL-G3",
        category_id=category.id,
        unit_id=unit.id,
        brand="DeWalt",
        model="DCD771"
    )
    db.add(product)
    db.commit()

    tool = Tool(
        product_id=product.id, 
        status=ToolStatus.AVAILABLE,
        serial_number="DRILL-G3-001",
        condition_id=1
    )
    db.add(tool)
    
    vehicle = Vehicle(
        brand="Toyota",
        model="Hilux",
        year=2020,
        license_plate="G3-TEST",
        vin="VIN-G3-TEST",
        status=VehicleStatus.AVAILABLE
    )
    db.add(vehicle)

    prod_epp = Product(
        name="Gloves G3",
        sku="EPP-G3",
        category_id=category.id,
        unit_id=unit.id
    )
    db.add(prod_epp)
    db.commit()
    
    epp = EPP(
        product_id=prod_epp.id,
        serial_number="EPP-G3-001",
        status=EPPStatus.AVAILABLE
    )
    db.add(epp)
    db.commit()
    
    # 2. Create Request (Operator)
    req_data = {
        "priority": "MEDIUM",
        "reason": "G3 Test",
        "expected_return_date": (datetime.now() + timedelta(days=5)).isoformat(),
        "tools": [{"tool_id": tool.id, "quantity": 1}],
        "vehicles": [{"vehicle_id": vehicle.id}],
        "epp_items": [{"epp_id": epp.id, "quantity": 2}]
    }
    
    res = client.post("/requests/integrated", json=req_data, headers=op_token)
    assert res.status_code == 200
    req_id = res.json()["id"]
    
    # 3. Submit Request
    res = client.post(f"/requests/integrated/{req_id}/submit", headers=op_token)
    assert res.status_code == 200

    # 4. Approve Request (Admin)
    res = client.post(f"/requests/integrated/{req_id}/approve", headers=admin_token)
    assert res.status_code == 200
    assert res.json()["status"] == "aprobada"
    
    # 5. Start Loan / Assign Items (Admin)
    # Get request items to find IDs
    req = client.get(f"/requests/integrated/{req_id}", headers=admin_token).json()
    req_tool_id = req["tools"][0]["id"]
    req_vehicle_id = req["vehicles"][0]["id"]
    
    # Assign Tool
    res = client.put(
        f"/requests/integrated/{req_id}/tools/{req_tool_id}",
        json={"status": "prestada"},
        headers=admin_token
    )
    assert res.status_code == 200
    
    # Assign Vehicle
    res = client.put(
        f"/requests/integrated/{req_id}/vehicles/{req_vehicle_id}",
        json={"status": "en_uso"},
        headers=admin_token
    )
    assert res.status_code == 200

    # 6. Operator Returns Items
    res = client.put(
        f"/requests/integrated/{req_id}/tools/{req_tool_id}",
        json={"status": "en_devolucion", "condition_in": "BUENO"},
        headers=op_token
    )
    assert res.status_code == 200
    
    res = client.put(
        f"/requests/integrated/{req_id}/vehicles/{req_vehicle_id}",
        json={"status": "en_devolucion", "odometer_in": 100, "fuel_level_in": "75-100%"},
        headers=op_token
    )
    assert res.status_code == 200

    # 7. Admin Confirms Return
    res = client.put(
        f"/requests/integrated/{req_id}/tools/{req_tool_id}",
        json={"status": "devuelta", "condition_in": "BUENO"},
        headers=admin_token
    )
    assert res.status_code == 200
    
    res = client.put(
        f"/requests/integrated/{req_id}/vehicles/{req_vehicle_id}",
        json={"status": "devuelto", "odometer_in": 100, "fuel_level_in": "75-100%"},
        headers=admin_token
    )
    assert res.status_code == 200
    
    # Check final status
    final_req = client.get(f"/requests/integrated/{req_id}", headers=admin_token).json()
    assert final_req["tools"][0]["status"] == "devuelta"
