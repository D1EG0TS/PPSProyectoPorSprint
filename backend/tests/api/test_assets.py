import pytest
from datetime import date, datetime, timedelta
from app.models.assets import AssetType, AssetStatus, CalibrationStatus, AssignmentStatus, DepreciationMethod

def test_create_asset_categories(client, superuser_token_headers):
    # Create category for Tools
    response = client.post(
        "/assets/categories",
        headers=superuser_token_headers,
        json={
            "code": "TOOLS-ELEC",
            "name": "Electric Tools",
            "asset_type": "herramienta",
            "requires_maintenance": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "TOOLS-ELEC"
    
    # Create category for Measuring Equipment
    response = client.post(
        "/assets/categories",
        headers=superuser_token_headers,
        json={
            "code": "MEASURE-PREC",
            "name": "Precision Measuring",
            "asset_type": "equipo_medicion",
            "requires_calibration": True
        }
    )
    assert response.status_code == 200

    # Create category for Computers
    response = client.post(
        "/assets/categories",
        headers=superuser_token_headers,
        json={
            "code": "IT-LAPTOP",
            "name": "Laptops",
            "asset_type": "activo_informatico",
            "depreciable": True,
            "useful_life_months": 36,
            "depreciation_method": "lineal"
        }
    )
    assert response.status_code == 200

def test_create_asset(client, normal_user_token_headers, superuser_token_headers):
    # First ensure categories exist
    client.post(
        "/assets/categories",
        headers=superuser_token_headers,
        json={
            "code": "TEST-CAT",
            "name": "Test Category",
            "asset_type": "herramienta"
        }
    )
    
    # Get category ID
    cats = client.get("/assets/categories", headers=normal_user_token_headers).json()
    cat = next(c for c in cats if c["code"] == "TEST-CAT")
    cat_id = cat["id"]
    
    response = client.post(
        "/assets/",
        headers=normal_user_token_headers,
        json={
            "category_id": cat_id,
            "name": "Test Drill",
            "brand": "Makita",
            "model": "X1",
            "serial_number": "SN123456",
            "acquisition_cost": 100.0,
            "status": "disponible"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Drill"
    assert data["asset_tag"].startswith("ACT-")

def test_calibration_flow(client, normal_user_token_headers, superuser_token_headers):
    # Create measuring category
    client.post(
        "/assets/categories",
        headers=superuser_token_headers,
        json={
            "code": "MEASURE-TEST",
            "name": "Test Measure",
            "asset_type": "equipo_medicion",
            "requires_calibration": True
        }
    )
    cats = client.get("/assets/categories", headers=normal_user_token_headers).json()
    cat = next(c for c in cats if c["code"] == "MEASURE-TEST")
    
    # Create asset
    asset = client.post(
        "/assets/",
        headers=normal_user_token_headers,
        json={
            "category_id": cat["id"],
            "name": "Multimeter",
            "serial_number": "MM001"
        }
    ).json()
    
    # Schedule/Record calibration
    today = date.today().isoformat()
    response = client.post(
        f"/assets/{asset['id']}/calibrate",
        headers=normal_user_token_headers,
        json={
            "asset_id": asset['id'],
            "calibration_date": today,
            "calibration_lab": "Test Lab",
            "passed": True
        }
    )
    assert response.status_code == 200
    
    # Check history
    history = client.get(f"/assets/{asset['id']}/calibration-history", headers=normal_user_token_headers).json()
    assert len(history) == 1
    assert history[0]["passed"] == True

def test_depreciation(client, normal_user_token_headers, superuser_token_headers):
    # Create depreciable category
    client.post(
        "/assets/categories",
        headers=superuser_token_headers,
        json={
            "code": "IT-TEST",
            "name": "Test IT",
            "asset_type": "activo_informatico",
            "depreciable": True,
            "useful_life_months": 12,
            "depreciation_method": "lineal"
        }
    )
    cats = client.get("/assets/categories", headers=normal_user_token_headers).json()
    cat = next(c for c in cats if c["code"] == "IT-TEST")
    
    # Create asset with past date
    past_date = (date.today() - timedelta(days=60)).isoformat() # 2 months ago
    asset = client.post(
        "/assets/",
        headers=normal_user_token_headers,
        json={
            "category_id": cat["id"],
            "name": "Old Laptop",
            "acquisition_cost": 1200.0,
            "acquisition_date": past_date,
            "serial_number": "LPT001"
        }
    ).json()
    
    # Calculate depreciation
    response = client.post(
        f"/assets/{asset['id']}/depreciate",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    # 1200 / 12 = 100 per month. 2 months = 200. New value should be around 1000.
    assert data["depreciation_amount"] > 0
    assert data["new_value"] < 1200

def test_assignment_flow(client, normal_user_token_headers, superuser_token_headers):
    # Setup asset
    client.post(
        "/assets/categories",
        headers=superuser_token_headers,
        json={"code": "TOOL-ASSIGN", "name": "Assign Tool", "asset_type": "herramienta"}
    )
    cats = client.get("/assets/categories", headers=normal_user_token_headers).json()
    cat = next(c for c in cats if c["code"] == "TOOL-ASSIGN")
    cat_id = cat["id"]
    
    asset = client.post(
        "/assets/",
        headers=normal_user_token_headers,
        json={"category_id": cat_id, "name": "Hammer", "serial_number": "H001", "status": "disponible"}
    ).json()
    
    # Get a user ID
    user = client.get("/users/me", headers=normal_user_token_headers).json()
    user_id = user["id"]
    
    # Assign
    assign_resp = client.post(
        f"/assets/{asset['id']}/assign",
        headers=normal_user_token_headers,
        json={
            "asset_id": asset['id'],
            "assigned_to": user_id,
            "purpose": "Construction"
        }
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["status"] == "activa"
    
    # Verify asset status
    asset_updated = client.get(f"/assets/{asset['id']}", headers=normal_user_token_headers).json()
    assert asset_updated["status"] == "asignado"
    
    # Return
    return_resp = client.post(
        f"/assets/{asset['id']}/return",
        headers=normal_user_token_headers,
        json={"condition_in": "bueno"}
    )
    assert return_resp.status_code == 200
    assert return_resp.json()["status"] == "devuelta"
    
    # Verify asset status
    asset_final = client.get(f"/assets/{asset['id']}", headers=normal_user_token_headers).json()
    assert asset_final["status"] == "disponible"
