import pytest
import concurrent.futures
from app.models.product import Product
from app.models.warehouse import Warehouse

def test_concurrent_movements(client, db, super_admin_token):
    # Setup: 100 items
    warehouse = Warehouse(name="Concurrency Warehouse", code="CONC001", location="Server Farm", created_by=1)
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    product = Product(name="Thread Safe Product", sku="THREAD001", description="Testing", price=10.0, category_id=1, unit_id=1)
    db.add(product)
    db.commit()
    db.refresh(product)

    # Initial Stock
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    client.post("/movements/", json={
        "product_id": product.id,
        "warehouse_id": warehouse.id,
        "type": "INBOUND",
        "quantity": 100,
        "reason": "Initial"
    }, headers=headers)

    # Function to deduct 1 item
    def make_deduction():
        try:
            res = client.post("/movements/", json={
                "product_id": product.id,
                "warehouse_id": warehouse.id,
                "type": "OUTBOUND",
                "quantity": 1,
                "reason": "Race Test"
            }, headers=headers)
            return res.status_code
        except Exception as e:
            return 500

    # Run 50 concurrent deductions
    # Note: TestClient isn't truly parallel in terms of server execution execution if running in-process, 
    # but it tests the DB locking/session handling to some extent if check_same_thread=False.
    # Ideally this catches naive race conditions.
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_deduction) for _ in range(100)]
        results = [f.result() for f in futures]

    # Verify all succeeded (assuming we didn't go below 0, which we shouldn't with 100 items and 100 requests)
    success_count = results.count(200)
    # Note: If logic allows negative stock, all 100 pass. 
    # If logic forbids negative stock, and we tried 101, one should fail.
    
    # Check final stock
    # We need a reliable way to get stock. 
    # Assuming /reports/inventory/summary or calculating from movements
    
    # Let's verify directly in DB to be sure
    from app.models.movement import Movement
    from sqlalchemy import func
    
    movements = db.query(Movement).filter(Movement.product_id == product.id).all()
    total = 0
    for m in movements:
        if m.type == "INBOUND":
            total += m.quantity
        elif m.type == "OUTBOUND":
            total -= m.quantity
            
    assert total == 0, f"Expected 0 stock, got {total}. Race condition likely occurred."
    assert success_count == 100

def test_concurrency_oversell_protection(client, db, super_admin_token):
    # Setup: 10 items
    warehouse = Warehouse(name="Oversell Warehouse", code="OVER001", location="Cloud", created_by=1)
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    product = Product(name="Limited Product", sku="LIMIT001", description="Testing", price=50.0, category_id=1, unit_id=1)
    db.add(product)
    db.commit()
    db.refresh(product)

    headers = {"Authorization": f"Bearer {super_admin_token}"}
    client.post("/movements/", json={
        "product_id": product.id,
        "warehouse_id": warehouse.id,
        "type": "INBOUND",
        "quantity": 10,
        "reason": "Initial"
    }, headers=headers)

    # Try to sell 1 item 20 times (Total 20 needed, only 10 available)
    # If correctly locked, only 10 should succeed.
    
    def make_deduction():
        res = client.post("/movements/", json={
            "product_id": product.id,
            "warehouse_id": warehouse.id,
            "type": "OUTBOUND",
            "quantity": 1,
            "reason": "Oversell Test"
        }, headers=headers)
        return res.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_deduction) for _ in range(20)]
        results = [f.result() for f in futures]

    successes = results.count(200)
    failures = results.count(400) + results.count(422) # Assuming 400/422 for insufficient stock
    
    # This assertion depends heavily on whether the backend actually enforces stock limits on creation
    # or if it allows negative stock. If it allows negative, this test is invalid for 'oversell protection'.
    # Assuming user wants validation of stock.
    
    # If the system is robust, it should never sell more than 10.
    # Note: If 20 requests come in, 10 should 200, 10 should 4xx.
    
    # If the system allows negative stock, successes will be 20.
    # We'll assert >= 10 successes, but ideally exactly 10 if strict.
    # Let's check DB stock.
    
    from app.models.movement import Movement
    movements = db.query(Movement).filter(Movement.product_id == product.id).all()
    total = 0
    for m in movements:
        if m.type == "INBOUND":
            total += m.quantity
        elif m.type == "OUTBOUND":
            total -= m.quantity
            
    assert total >= 0, "Stock went below zero! Concurrency failure."
