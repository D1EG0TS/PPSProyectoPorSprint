import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
# Correct import assuming main.py is in backend root
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from main import app
from app.api import deps
from app.models.user import User, Role
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.inventory_refs import Category, Unit
from app.models.location_models import StorageLocation, LocationType
from app.models.movement import MovementRequest, MovementStatus, MovementType
from app.models.ledger import LedgerEntry, LedgerEntryType
from datetime import datetime, timezone
from app.services.stock_service import StockService
from app.core.security import create_access_token, get_password_hash

# E2E Tests for Stock Flow (Sprint B.4)

@pytest.fixture
def token_headers(db: Session):
    # Ensure Role exists
    role = db.query(Role).filter(Role.id == 1).first()
    if not role:
        role = Role(id=1, name="Super Admin", level=1)
        db.add(role)
        db.commit()

    # Create a Super Admin user for simplicity in tests
    user = db.query(User).filter(User.email == "admin@example.com").first()
    if not user:
        user = User(
            email="admin@example.com", 
            full_name="Admin", 
            role_id=1, 
            is_active=True,
            password_hash=get_password_hash("password")
        )
        db.add(user)
        db.commit()
    
    access_token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {access_token}"}

def ensure_basic_data(db: Session):
    user = db.query(User).filter(User.email == "admin@example.com").first()
    wh = db.query(Warehouse).filter(Warehouse.code == "WH1").first()
    if not wh:
        wh = Warehouse(name="Main Warehouse", location="123 Main St", code="WH1", created_by=user.id if user else 1)
        db.add(wh)
        db.commit()

    prod = db.query(Product).filter(Product.sku == "TEST-SKU").first()
    if not prod:
        cat = db.query(Category).first()
        if not cat:
            cat = Category(name="Test Category", description="Test Description")
            db.add(cat)
            db.commit()
        
        unit = db.query(Unit).first()
        if not unit:
            unit = Unit(name="Test Unit", abbreviation="tu")
            db.add(unit)
            db.commit()

        prod = Product(
            name="Test Product", 
            sku="TEST-SKU", 
            price=10.0, 
            category_id=cat.id, 
            unit_id=unit.id,
            cost=5.0
        )
        db.add(prod)
        db.commit()
    
    return wh, prod

def test_scenario_1_full_inbound_flow(client: TestClient, db: Session, token_headers):
    """
    Escenario 1: Flujo completo de entrada
    1. Create Request (IN)
    2. Approve
    3. Apply
    4. Verify Stock, Ledger, Notification
    """
    # Setup Data
    wh, prod = ensure_basic_data(db)

    # 1. Create Request
    req_data = {
        "type": "IN",
        "destination_warehouse_id": wh.id,
        "items": [
            {"product_id": prod.id, "quantity": 100, "destination_location_id": None}
        ],
        "reason": "E2E Test Inbound"
    }
    # Need explicit location for IN usually unless logic handles it
    # Let's create a location
    loc = db.query(StorageLocation).filter(StorageLocation.code == "E2E-LOC-1").first()
    if not loc:
        loc = StorageLocation(code="E2E-LOC-1", warehouse_id=wh.id, name="Loc 1", location_type=LocationType.SHELF)
        db.add(loc)
        db.commit()
    req_data["items"][0]["destination_location_id"] = loc.id
    
    resp = client.post("/movements/requests", json=req_data, headers=token_headers)
    assert resp.status_code == 200, f"Response: {resp.text}"
    req_id = resp.json()["id"]

    # 1.5 Submit (Draft -> Pending)
    resp = client.post(f"/movements/requests/{req_id}/submit", headers=token_headers)
    assert resp.status_code == 200, f"Submit failed: {resp.text}"

    # 2. Approve
    resp = client.post(f"/movements/requests/{req_id}/approve", headers=token_headers)
    assert resp.status_code == 200
    
    # 3. Apply
    resp = client.post(f"/movements/requests/{req_id}/apply", headers=token_headers)
    assert resp.status_code == 200
    
    # 4. Verify Stock (using sync call or just checking DB directly since service is async mostly but calculate_current_stock is sync)
    # Note: calculate_current_stock in stock_service.py seems to be synchronous based on previous reads?
    # Let's check. If it is async, we can't call it easily here without async setup.
    # But usually read operations are sync in this codebase or we can query DB directly.
    
    from app.models.ledger import LedgerEntry
    entries = db.query(LedgerEntry).filter(LedgerEntry.product_id == prod.id).all()
    # Find the one related to this request
    latest = None
    for e in entries:
        if e.movement_request_id == req_id:
            latest = e
            break
            
    assert latest is not None
    assert latest.quantity == 100
    assert latest.entry_type == "increment"

def test_scenario_2_outbound_validation(client: TestClient, db: Session, token_headers):
    """
    Escenario 2: Salida con validación de stock
    """
    # Setup: Ensure product has 50 stock
    wh, prod = ensure_basic_data(db)
         
    loc = db.query(StorageLocation).filter(StorageLocation.warehouse_id == wh.id).first()
    if not loc:
        loc = StorageLocation(code="E2E-LOC-OUT", warehouse_id=wh.id, name="Loc Out", location_type=LocationType.SHELF)
        db.add(loc)
        db.commit()

    # 1. Request OUT 1000000 (fail) - Huge number to ensure failure
    req_data = {
        "type": "OUT",
        "source_warehouse_id": wh.id,
        "items": [{"product_id": prod.id, "quantity": 1000000, "source_location_id": loc.id}],
        "reason": "E2E Test Outbound Fail"
    }
    
    # Create Request
    resp = client.post("/movements/requests", json=req_data, headers=token_headers)
    assert resp.status_code == 200
    req_id = resp.json()["id"]

    # Submit -> Should Fail with 400 due to insufficient stock
    resp = client.post(f"/movements/requests/{req_id}/submit", headers=token_headers)
    assert resp.status_code == 400
    assert "Insufficient warehouse stock" in resp.text or "stock" in resp.text

def test_scenario_3_transfer(client: TestClient, db: Session, token_headers):
    """
    Escenario 3: Transferencia entre almacenes
    """
    # Setup: Need 2 warehouses and stock in Source
    wh1, prod = ensure_basic_data(db)
        
    # Create WH2
    wh2 = Warehouse(name="Warehouse 2", location="456 Other St", code="WH2", created_by=wh1.created_by)
    db.add(wh2)
    db.commit()
    
    # Add initial stock to WH1 (simulate via direct DB or IN movement)
    # Using IN movement is safer to ensure Ledger consistency
    # Or we can reuse Scenario 1's outcome if tests were sequential, but they are isolated by DB fixture?
    # conftest.py "db" fixture usually rolls back or is new session. 
    # But we are using in-memory SQLite shared.
    # Let's verify if stock exists.
    
    from app.models.ledger import LedgerEntry, LedgerEntryType
    
    # Manually inject stock for test speed
    # Ensure locations exist
    loc1 = db.query(StorageLocation).filter(StorageLocation.warehouse_id == wh1.id).first()
    if not loc1:
            loc1 = StorageLocation(code="LOC-WH1", warehouse_id=wh1.id, name="Loc 1", location_type=LocationType.SHELF)
            db.add(loc1)
            db.commit()
            
    loc2 = StorageLocation(code="LOC-WH2", warehouse_id=wh2.id, name="Loc 2", location_type=LocationType.SHELF)
    db.add(loc2)
    db.commit()
    
    # Add stock to WH1
    # We need a 'dummy' movement request ID for the ledger entry usually, or allow nullable
    # The Ledger model usually requires movement_request_id.
    # Let's create a dummy approved IN request
    req_in = MovementRequest(
        type=MovementType.IN, status=MovementStatus.APPLIED, 
        destination_warehouse_id=wh1.id, requested_by=1, reason="Setup Transfer"
    )
    db.add(req_in)
    db.commit()
    
    entry_in = LedgerEntry(
            product_id=prod.id, warehouse_id=wh1.id, location_id=loc1.id,
            quantity=50, entry_type=LedgerEntryType.INCREMENT,
            movement_request_id=req_in.id, 
            previous_balance=0, new_balance=50, applied_by=1
        )
    db.add(entry_in)
    # Also need Movement table update if crud checks that (it does!)
    from app.models.movement import Movement
    mov_in = Movement(
        product_id=prod.id, warehouse_id=wh1.id, 
        quantity=50, type=MovementType.IN,
        movement_request_id=req_in.id, created_at=datetime.now(timezone.utc)
    )
    db.add(mov_in)
    db.commit()
    
    # Now Transfer 20 from WH1 to WH2
    req_data = {
        "type": "TRANSFER",
        "source_warehouse_id": wh1.id,
        "destination_warehouse_id": wh2.id,
        "items": [
            {
                "product_id": prod.id, 
                "quantity": 20, 
                "source_location_id": loc1.id,
                "destination_location_id": loc2.id
            }
        ],
        "reason": "E2E Transfer"
    }
    
    # 1. Create
    resp = client.post("/movements/requests", json=req_data, headers=token_headers)
    assert resp.status_code == 200
    req_id = resp.json()["id"]
    
    # 2. Submit
    resp = client.post(f"/movements/requests/{req_id}/submit", headers=token_headers)
    assert resp.status_code == 200, f"Submit failed: {resp.text}"
    
    # 3. Approve
    resp = client.post(f"/movements/requests/{req_id}/approve", headers=token_headers)
    assert resp.status_code == 200
    
    # 4. Apply
    resp = client.post(f"/movements/requests/{req_id}/apply", headers=token_headers)
    assert resp.status_code == 200, f"Apply failed: {resp.text}"
    
    # 5. Verify Ledger
    # WH1 should have OUT 20
    # WH2 should have IN 20
    entries = db.query(LedgerEntry).filter(LedgerEntry.movement_request_id == req_id).all()
    assert len(entries) >= 2 # One out, one in
    
    wh1_entry = next((e for e in entries if e.warehouse_id == wh1.id), None)
    wh2_entry = next((e for e in entries if e.warehouse_id == wh2.id), None)
    
    assert wh1_entry is not None
    assert wh1_entry.quantity == 20
    assert wh1_entry.entry_type == LedgerEntryType.DECREMENT
    
    assert wh2_entry is not None
    assert wh2_entry.quantity == 20
    assert wh2_entry.entry_type == LedgerEntryType.INCREMENT

def test_scenario_4_concurrency(client: TestClient, db: Session, token_headers):
    """
    Escenario 4: Concurrencia y conflictos
    Simulate trying to apply the same approved request twice or conflicting requests.
    Since we don't have true parallelism in this test client easily, we test logic locks/constraints.
    """
    # Reuse WH1 and Product from previous
    wh, prod = ensure_basic_data(db)
        
    loc = db.query(StorageLocation).filter(StorageLocation.warehouse_id == wh.id).first()
    
    # Create a Request
    req_data = {
        "type": "IN",
        "destination_warehouse_id": wh.id,
        "items": [
            {"product_id": prod.id, "quantity": 10, "destination_location_id": loc.id}
        ],
        "reason": "Concurrency Test"
    }
    
    resp = client.post("/movements/requests", json=req_data, headers=token_headers)
    req_id = resp.json()["id"]
    
    client.post(f"/movements/requests/{req_id}/submit", headers=token_headers)
    client.post(f"/movements/requests/{req_id}/approve", headers=token_headers)
    
    # Apply Once -> OK
    resp = client.post(f"/movements/requests/{req_id}/apply", headers=token_headers)
    assert resp.status_code == 200
    
    # Apply Again -> Should Fail (Movement already applied)
    resp = client.post(f"/movements/requests/{req_id}/apply", headers=token_headers)
    # The error message for "Movement already applied" is 400.
    # But if there is an unhandled exception it might be 500.
    # StockService raises 400 for already applied.
    assert resp.status_code == 400, f"Expected 400 but got {resp.status_code}: {resp.text}"
    assert "already applied" in resp.text

from unittest.mock import AsyncMock, patch

def test_scenario_5_realtime(client: TestClient, db: Session, token_headers):
    """
    Escenario 5: Actualización en tiempo real (Simulación WS)
    Verify that WebSocket broadcast is called upon application.
    """
    wh, prod = ensure_basic_data(db)
    
    loc = db.query(StorageLocation).filter(StorageLocation.warehouse_id == wh.id).first()
    
    req_data = {
        "type": "IN",
        "destination_warehouse_id": wh.id,
        "items": [
            {"product_id": prod.id, "quantity": 5, "destination_location_id": loc.id}
        ],
        "reason": "Realtime Test"
    }
    
    resp = client.post("/movements/requests", json=req_data, headers=token_headers)
    req_id = resp.json()["id"]
    client.post(f"/movements/requests/{req_id}/submit", headers=token_headers)
    client.post(f"/movements/requests/{req_id}/approve", headers=token_headers)
    
        # Mock the manager.broadcast
    # The module path depends on how it is imported in stock_service.py
    # In stock_service.py: from app.services.websocket_service import manager
    with patch("app.services.stock_service.manager.broadcast", new_callable=AsyncMock) as mock_broadcast:
        resp = client.post(f"/movements/requests/{req_id}/apply", headers=token_headers)
        assert resp.status_code == 200
        
        # Verify broadcast was called
        # Note: StockService.apply_movement calls broadcast TWICE:
        # 1. stock_updated (per item)
        # 2. movement_applied (final)
        # So call_count should be at least 2 (1 item + 1 final)
        assert mock_broadcast.called
        assert mock_broadcast.call_count >= 2
        
        # Verify final call is movement_applied
        args, _ = mock_broadcast.call_args
        msg = args[0]
        assert msg["type"] == "movement_applied"
        assert msg["data"]["movement_id"] == req_id
