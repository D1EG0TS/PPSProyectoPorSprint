from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.models import location_models, product_location_models, product as product_models, warehouse as warehouse_models
from app.schemas import location as schemas
from app.schemas import product_location as assignment_schemas
from app.models.user import User

router = APIRouter()

def check_read_permissions(user: User):
    if user.role_id not in [1, 2, 3]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view locations"
        )

def check_write_permissions(user: User):
    if user.role_id not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify locations"
        )

@router.get("/search", response_model=List[schemas.StorageLocationResponse])
def search_locations(
    q: Optional[str] = Query(None, description="Search by code, barcode or name"),
    barcode: Optional[str] = Query(None, description="Legacy parameter"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Search location by barcode, code or name.
    """
    check_read_permissions(current_user)
    
    search_term = q or barcode
    if not search_term:
        raise HTTPException(status_code=400, detail="Search term required")

    # Exact match first
    locations = db.query(location_models.StorageLocation).filter(
        (location_models.StorageLocation.barcode == search_term) | 
        (location_models.StorageLocation.code == search_term)
    ).all()
    
    if not locations:
        # Try partial match on code or name
        locations = db.query(location_models.StorageLocation).filter(
            (location_models.StorageLocation.code.like(f"%{search_term}%")) |
            (location_models.StorageLocation.name.like(f"%{search_term}%"))
        ).all()

    if not locations:
        raise HTTPException(status_code=404, detail="Location not found")
        
    return locations

@router.get("/{location_id}", response_model=schemas.StorageLocationResponse)
def read_location(
    location_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get location details.
    """
    check_read_permissions(current_user)
    location = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.id == location_id
    ).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@router.put("/{location_id}", response_model=schemas.StorageLocationResponse)
def update_location(
    location_id: int,
    location_update: schemas.StorageLocationUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update a location.
    """
    check_write_permissions(current_user)
    db_location = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.id == location_id
    ).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found")

    update_data = location_update.model_dump(exclude_unset=True)
    
    # Check barcode uniqueness if changed
    if "barcode" in update_data and update_data["barcode"] != db_location.barcode:
        existing = db.query(location_models.StorageLocation).filter(
            location_models.StorageLocation.barcode == update_data["barcode"]
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Barcode already exists")

    # Check code uniqueness within warehouse if changed
    if "code" in update_data and update_data["code"] != db_location.code:
        existing = db.query(location_models.StorageLocation).filter(
            location_models.StorageLocation.warehouse_id == db_location.warehouse_id,
            location_models.StorageLocation.code == update_data["code"]
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Location code already exists in this warehouse")
            
        # Update path logic would be needed here if code changes
        # For simplicity, assuming path update logic is handled or we rebuild it
        parent_path = ""
        if db_location.parent_location_id:
             parent = db.query(location_models.StorageLocation).filter(location_models.StorageLocation.id == db_location.parent_location_id).first()
             parent_path = parent.path if parent and parent.path else ""
        elif db_location.parent: # fallback if loaded
             parent_path = db_location.parent.path if db_location.parent.path else ""
             
        # Path reconstruction logic should be more robust (recursive update for children)
        # But for now, basic update
        pass 

    for key, value in update_data.items():
        setattr(db_location, key, value)

    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete a location.
    """
    check_write_permissions(current_user)
    db_location = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.id == location_id
    ).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found")
        
    # Check for children
    children = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.parent_location_id == location_id
    ).count()
    if children > 0:
        raise HTTPException(status_code=400, detail="Cannot delete location with sub-locations")
        
    # Check for assigned products
    assignments = db.query(product_location_models.ProductLocationAssignment).filter(
        product_location_models.ProductLocationAssignment.location_id == location_id,
        product_location_models.ProductLocationAssignment.quantity > 0
    ).count()
    if assignments > 0:
        raise HTTPException(status_code=400, detail="Cannot delete location containing products")

    db.delete(db_location)
    db.commit()

@router.get("/{location_id}/inventory", response_model=List[assignment_schemas.ProductLocationAssignmentResponse])
def read_location_inventory(
    location_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get inventory in a location.
    """
    check_read_permissions(current_user)
    inventory = db.query(product_location_models.ProductLocationAssignment).filter(
        product_location_models.ProductLocationAssignment.location_id == location_id,
        product_location_models.ProductLocationAssignment.quantity > 0
    ).all()
    return inventory
