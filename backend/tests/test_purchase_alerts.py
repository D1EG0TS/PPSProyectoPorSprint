import pytest
from app.models.purchase import PurchaseAlert, PurchaseAlertReason, PurchaseAlertStatus
from app.models.product import Product
from app.models.tool import Tool, ToolStatus
from app.models.epp import EPP, EPPStatus

def test_create_alert_endpoint(client, super_admin_token, db):
    # Create a product for the alert
    product = Product(name="Test Product for Alert", sku="ALERT-001", category_id=1, unit_id=1, min_stock=10)
    db.add(product)
    db.commit()
    db.refresh(product)
    
    # Create Alert via Service (simulation)
    # Ideally we test the endpoint if we exposed a create endpoint, but we only exposed GET/PUT
    # So we'll test the service logic implicitly by creating one manually in DB or using the service function if we could import it here easily.
    # But for integration test, let's just insert one into DB and fetch it via API.
    
    alert = PurchaseAlert(
        product_id=product.id,
        reason=PurchaseAlertReason.LOW_STOCK,
        quantity_needed=50,
        notes="Test Alert"
    )
    db.add(alert)
    db.commit()
    
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    response = client.get("/purchase/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    found = False
    for item in data:
        if item["id"] == alert.id:
            found = True
            assert item["reason"] == "LOW_STOCK"
            assert item["product_name"] == "Test Product for Alert"
            break
    assert found

def test_update_alert_endpoint(client, super_admin_token, db):
    # Create Alert
    alert = PurchaseAlert(
        reason=PurchaseAlertReason.LOST,
        notes="Lost Tool",
        priority="HIGH"
    )
    db.add(alert)
    db.commit()
    
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    update_data = {"status": "ORDERED", "notes": "Ordered replacement"}
    response = client.put(f"/purchase/{alert.id}", json=update_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ORDERED"
    assert data["notes"] == "Ordered replacement"
    
    # Verify DB
    db.refresh(alert)
    assert alert.status == PurchaseAlertStatus.ORDERED
