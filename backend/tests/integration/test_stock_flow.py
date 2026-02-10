import pytest
from app.models.movement import MovementRequest, MovementType, MovementStatus, MovementRequestItem
from app.models.ledger import LedgerEntry, LedgerEntryType
from app.services.stock_service import StockService
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.location_models import StorageLocation
from app.models.user import User
from app.core.cache import stock_cache

from app.models.user import User

def test_stock_flow_full(client, db, super_admin_token):
    # 0. Setup Data
    # Get user for created_by (created by super_admin_token fixture)
    user = db.query(User).filter(User.email == "superadmin_test@example.com").first()
    assert user is not None

    # Create Warehouse
    wh1 = Warehouse(
        name="WH1", 
        code="WH-001",
        location="Addr1", 
        is_active=True,
        created_by=user.id
    )
    db.add(wh1)
    db.commit()
    db.refresh(wh1)
    
    # Create Product
    prod = Product(name="Test Product", sku="TEST-SKU-001", price=100.0, is_active=True, category_id=1, unit_id=1)
    db.add(prod)
    db.commit()
    db.refresh(prod)
    
    # Create Location
    loc1 = StorageLocation(name="LOC-001", code="LOC-001", warehouse_id=wh1.id, barcode="LOC001")
    db.add(loc1)
    db.commit()
    db.refresh(loc1)
    
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # 1. Test IN Movement (Entry)
    # Create Request
    req_in_data = {
        "type": MovementType.IN,
        "destination_warehouse_id": wh1.id,
        "items": [
            {"product_id": prod.id, "quantity": 50, "destination_location_id": loc1.id}
        ]
    }
    
    # We need to simulate the API call or Service call for creation. 
    # Let's use the Service or direct DB insertion for speed, but API is better for integration.
    # Using API for creation requires ensuring all deps are mocked/ready.
    # Let's use DB direct for setup to focus on StockService logic or use API if easy.
    # We'll use DB for Request creation to avoid API complexity in this specific test file if API test exists elsewhere.
    # But user asked for "Tests de Integración".
    
    # Create Movement Request manually
    req_in = MovementRequest(
        type=MovementType.IN,
        status=MovementStatus.PENDING,
        destination_warehouse_id=wh1.id,
        requested_by=user.id # Super Admin
    )
    db.add(req_in)
    db.commit()
    db.refresh(req_in)
    
    item_in = MovementRequestItem(
        request_id=req_in.id,
        product_id=prod.id,
        quantity=50,
        destination_location_id=loc1.id
    )
    db.add(item_in)
    db.commit()
    
    # Approve
    # Call endpoint /movements/requests/{id}/approve
    resp = client.post(f"/movements/requests/{req_in.id}/approve", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == MovementStatus.APPROVED
    
    # Apply
    # Call endpoint /movements/requests/{id}/apply
    # First, ensure cache is empty/clean
    stock_cache.clear()
    
    resp = client.post(f"/movements/requests/{req_in.id}/apply", headers=headers)
    assert resp.status_code == 200
    
    # Verify Ledger
    ledger = db.query(LedgerEntry).filter(LedgerEntry.movement_request_id == req_in.id).first()
    assert ledger is not None
    assert ledger.entry_type == LedgerEntryType.INCREMENT
    assert ledger.quantity == 50
    assert ledger.new_balance == 50
    
    # Verify Stock Calculation
    current_stock = StockService.calculate_current_stock(db, prod.id, wh1.id)
    assert current_stock == 50
    
    # Verify Cache
    # calculate_current_stock should have set the cache
    cached_val = stock_cache.get(f"stock:{prod.id}:{wh1.id}:None")
    assert cached_val == 50
    
    # 2. Test OUT Movement (Exit)
    req_out = MovementRequest(
        type=MovementType.OUT,
        status=MovementStatus.PENDING,
        source_warehouse_id=wh1.id,
        requested_by=user.id
    )
    db.add(req_out)
    db.commit()
    db.refresh(req_out)
    
    item_out = MovementRequestItem(
        request_id=req_out.id,
        product_id=prod.id,
        quantity=20,
        source_location_id=loc1.id
    )
    db.add(item_out)
    db.commit()
    
    # Approve
    client.post(f"/movements/requests/{req_out.id}/approve", headers=headers)
    
    # Apply
    resp = client.post(f"/movements/requests/{req_out.id}/apply", headers=headers)
    assert resp.status_code == 200
    
    # Verify Stock
    current_stock = StockService.calculate_current_stock(db, prod.id, wh1.id)
    assert current_stock == 30
    
    # Verify Cache Invalidation & Update
    # The previous cache should have been invalidated by apply
    # The new call to calculate_current_stock should have refreshed it
    cached_val = stock_cache.get(f"stock:{prod.id}:{wh1.id}:None")
    assert cached_val == 30

    # 3. Test Insufficient Stock
    req_fail = MovementRequest(
        type=MovementType.OUT,
        status=MovementStatus.PENDING,
        source_warehouse_id=wh1.id,
        requested_by=user.id
    )
    db.add(req_fail)
    db.commit()
    db.refresh(req_fail)
    
    item_fail = MovementRequestItem(
        request_id=req_fail.id,
        product_id=prod.id,
        quantity=100, # More than 30
        source_location_id=loc1.id
    )
    db.add(item_fail)
    db.commit()
    
    client.post(f"/movements/requests/{req_fail.id}/approve", headers=headers)
    
    # Apply -> Should Fail
    resp = client.post(f"/movements/requests/{req_fail.id}/apply", headers=headers)
    assert resp.status_code == 500 # Service raises Exception, caught by router -> 500 or specific handling
    # StockService raises HTTPException(500, detail=str(ValueError)) or just propagates exception.
    # In endpoint:
    # try: result = StockService.apply_movement(...) except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    # So it should be 500.
    
    assert "Insufficient stock" in resp.json()["detail"]
    
    # Verify Stock Unchanged
    current_stock = StockService.calculate_current_stock(db, prod.id, wh1.id)
    assert current_stock == 30

    # 4. Test TRANSFER Movement
    # Create another warehouse
    wh2 = Warehouse(
        name="WH2", 
        code="WH-002",
        location="Addr2", 
        is_active=True,
        created_by=user.id
    )
    db.add(wh2)
    db.commit()
    db.refresh(wh2)
    
    req_transfer = MovementRequest(
        type=MovementType.TRANSFER,
        status=MovementStatus.PENDING,
        source_warehouse_id=wh1.id,
        destination_warehouse_id=wh2.id,
        requested_by=user.id
    )
    db.add(req_transfer)
    db.commit()
    db.refresh(req_transfer)
    
    item_transfer = MovementRequestItem(
        request_id=req_transfer.id,
        product_id=prod.id,
        quantity=10,
        source_location_id=loc1.id
        # destination_location_id can be None or set. Let's say None for WH2 general stock
    )
    db.add(item_transfer)
    db.commit()
    
    client.post(f"/movements/requests/{req_transfer.id}/approve", headers=headers)
    
    resp = client.post(f"/movements/requests/{req_transfer.id}/apply", headers=headers)
    assert resp.status_code == 200
    
    # Verify WH1 Stock (30 - 10 = 20)
    stock_wh1 = StockService.calculate_current_stock(db, prod.id, wh1.id)
    assert stock_wh1 == 20
    
    # Verify WH2 Stock (0 + 10 = 10)
    stock_wh2 = StockService.calculate_current_stock(db, prod.id, wh2.id)
    assert stock_wh2 == 10
