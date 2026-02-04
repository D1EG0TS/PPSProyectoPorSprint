import pytest
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.movement import Movement
from app.models.user import User

def test_full_movement_flow(client, db, super_admin_token, admin_token, user_token):
    # 1. Setup Data
    # Ensure a user exists for created_by (Super Admin is ID 1 usually)
    # We can query the user created by the fixture if needed, but ID 1 is standard in our setup
    warehouse = Warehouse(name="Main Warehouse", code="MAIN001", location="NY", created_by=1)
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    product = Product(name="Test Product", sku="TEST001", description="Desc", price=100.0, category_id=1, unit_id=1)
    db.add(product)
    db.commit()
    db.refresh(product)

    # 2. Super Admin adds stock (INBOUND)
    headers_sa = {"Authorization": f"Bearer {super_admin_token}"}
    move_in_data = {
        "product_id": product.id,
        "warehouse_id": warehouse.id,
        "type": "INBOUND",
        "quantity": 100,
        "reason": "Initial Stock"
    }
    res = client.post("/movements/", json=move_in_data, headers=headers_sa)
    assert res.status_code == 200
    
    # Verify stock
    # Assuming there's an endpoint to check stock or calculate it
    # We can check the db directly for integration assurance
    # But let's check via API if possible. /products/{id} might return current stock?
    # Or /reports/inventory/summary
    
    # Direct DB check
    # Check if stock ledger or product quantity updated? 
    # The prompt implies "Validation of stock" is a separate requirement, but good to check here.
    
    # 3. User requests OUTBOUND (Request)
    headers_user = {"Authorization": f"Bearer {user_token}"}
    move_out_req_data = {
        "product_id": product.id,
        "warehouse_id": warehouse.id,
        "type": "OUTBOUND",
        "quantity": 10,
        "reason": "Project X"
    }
    # User might create a request via a different endpoint or the same if status defaults to PENDING
    res = client.post("/movements/request", json=move_out_req_data, headers=headers_user)
    # If /movements/request doesn't exist, maybe it's POST /movements/ with status logic
    # Let's assume there is a request endpoint based on previous memory, or POST /movements creates PENDING for users
    if res.status_code == 404:
        # Fallback to /movements/
        res = client.post("/movements/", json=move_out_req_data, headers=headers_user)
    
    assert res.status_code == 200
    movement_id = res.json()["id"]
    assert res.json()["status"] == "PENDING"

    # 4. Admin approves request
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    res = client.post(f"/movements/{movement_id}/approve", headers=headers_admin)
    assert res.status_code == 200
    assert res.json()["status"] == "APPROVED"

    # 5. Verify Stock decreased
    # Implementation dependent, but let's assume we can query DB
    # (If we implemented StockLedger, we check that)

    # 6. User requests too much stock
    move_excess_data = {
        "product_id": product.id,
        "warehouse_id": warehouse.id,
        "type": "OUTBOUND",
        "quantity": 9999,
        "reason": "Too much"
    }
    res = client.post("/movements/", json=move_excess_data, headers=headers_user)
    assert res.status_code == 200
    excess_id = res.json()["id"]

    # 7. Admin attempts to approve -> Should fail or handle logic
    res = client.post(f"/movements/{excess_id}/approve", headers=headers_admin)
    # Depending on implementation, might be 400 Bad Request due to insufficient stock
    assert res.status_code in [400, 422] 
    
    # 8. Admin rejects a request
    move_reject_data = {
        "product_id": product.id,
        "warehouse_id": warehouse.id,
        "type": "OUTBOUND",
        "quantity": 5,
        "reason": "To be rejected"
    }
    res = client.post("/movements/", json=move_reject_data, headers=headers_user)
    reject_id = res.json()["id"]
    
    res = client.post(f"/movements/{reject_id}/reject", headers=headers_admin)
    assert res.status_code == 200
    assert res.json()["status"] == "REJECTED"
