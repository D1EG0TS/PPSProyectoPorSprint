from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud.movement import movement
from app.schemas import warehouse as schemas
from app.schemas import location as location_schemas
from app.models import warehouse as models
from app.models import location_models
from app.models.user import User

router = APIRouter()

# Helper for permissions
def check_read_permissions(user: User):
    if user.role_id not in [1, 2, 3]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view warehouses"
        )

def check_write_permissions(user: User):
    if user.role_id not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify warehouses"
        )

@router.get("/", response_model=List[schemas.Warehouse])
def read_warehouses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    List warehouses with pagination.
    Roles allowed: 1, 2, 3.
    """
    check_read_permissions(current_user)
    warehouses = db.query(models.Warehouse).offset(skip).limit(limit).all()
    return warehouses

@router.post("/", response_model=schemas.Warehouse)
def create_warehouse(
    warehouse: schemas.WarehouseCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create a new warehouse.
    Roles allowed: 1, 2.
    """
    check_write_permissions(current_user)
    
    # Check for unique code
    existing_warehouse = db.query(models.Warehouse).filter(models.Warehouse.code == warehouse.code).first()
    if existing_warehouse:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Warehouse with this code already exists"
        )
        
    db_warehouse = models.Warehouse(
        **warehouse.model_dump(),
        created_by=current_user.id
    )
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse

@router.get("/{warehouse_id}", response_model=schemas.Warehouse)
def read_warehouse(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get warehouse details.
    Roles allowed: 1, 2, 3.
    """
    check_read_permissions(current_user)
    warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse

@router.get("/{warehouse_id}/stock", response_model=List[schemas.WarehouseStockItem])
def read_warehouse_stock(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get full stock inventory for a warehouse.
    """
    check_read_permissions(current_user)
    
    warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
        
    stock = movement.get_warehouse_stock(db, warehouse_id=warehouse_id)
    return stock

@router.put("/{warehouse_id}", response_model=schemas.Warehouse)
def update_warehouse(
    warehouse_id: int,
    warehouse_update: schemas.WarehouseUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update a warehouse.
    Roles allowed: 1, 2.
    """
    check_write_permissions(current_user)
    db_warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if db_warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
        
    update_data = warehouse_update.model_dump(exclude_unset=True)
    
    # If code is being updated, check uniqueness
    if "code" in update_data and update_data["code"] != db_warehouse.code:
        existing = db.query(models.Warehouse).filter(models.Warehouse.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Warehouse with this code already exists")
            
    for key, value in update_data.items():
        setattr(db_warehouse, key, value)
        
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse

@router.delete("/{warehouse_id}", response_model=schemas.Warehouse)
def delete_warehouse(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Soft delete a warehouse (set is_active=False).
    Roles allowed: 1, 2.
    """
    check_write_permissions(current_user)
    db_warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if db_warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
        
    db_warehouse.is_active = False
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse

@router.get("/{warehouse_id}/locations/tree", response_model=List[location_schemas.StorageLocationResponse])
def read_warehouse_locations_tree(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get locations for a warehouse in tree structure.
    Roles allowed: 1, 2, 3.
    """
    check_read_permissions(current_user)
    warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
        
    # Get only root locations (parent_location_id is None)
    # The response model will handle recursion for children if configured correctly
    locations = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.warehouse_id == warehouse_id,
        location_models.StorageLocation.parent_location_id == None
    ).all()
    return locations

@router.get("/{warehouse_id}/locations", response_model=List[location_schemas.StorageLocationResponse])
def read_warehouse_locations(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get locations for a warehouse.
    Roles allowed: 1, 2, 3.
    """
    check_read_permissions(current_user)
    warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
        
    locations = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.warehouse_id == warehouse_id,
        location_models.StorageLocation.parent_location_id == None
    ).all()
    return locations

@router.post("/{warehouse_id}/locations", response_model=location_schemas.StorageLocationResponse)
def create_location(
    warehouse_id: int,
    location: location_schemas.StorageLocationCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create a location in a warehouse.
    Roles allowed: 1, 2.
    """
    check_write_permissions(current_user)
    warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
        
    # Check if parent exists if provided
    parent_path = ""
    if location.parent_location_id:
        parent = db.query(location_models.StorageLocation).filter(location_models.StorageLocation.id == location.parent_location_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent location not found")
        if parent.warehouse_id != warehouse_id:
             raise HTTPException(status_code=400, detail="Parent location belongs to a different warehouse")
        parent_path = parent.path if parent.path else ""
    
    # Check uniqueness of code within warehouse
    existing = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.warehouse_id == warehouse_id,
        location_models.StorageLocation.code == location.code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Location code already exists in this warehouse")

    # Generate path
    # Path logic: /CODE or /PARENT/CODE
    path = f"{parent_path}/{location.code}"
    
    # Check barcode uniqueness
    if location.barcode:
        existing_barcode = db.query(location_models.StorageLocation).filter(
            location_models.StorageLocation.barcode == location.barcode
        ).first()
        if existing_barcode:
            raise HTTPException(status_code=400, detail="Barcode already exists")

    db_location = location_models.StorageLocation(
        **location.model_dump(exclude={"warehouse_id"}),
        warehouse_id=warehouse_id,
        path=path
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@router.put("/{warehouse_id}/locations/{location_id}", response_model=location_schemas.StorageLocationResponse)
def update_location(
    warehouse_id: int,
    location_id: int,
    location_update: location_schemas.StorageLocationUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update a location.
    Roles allowed: 1, 2.
    """
    check_write_permissions(current_user)
    
    # Get location ensuring it belongs to the warehouse
    db_location = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.id == location_id,
        location_models.StorageLocation.warehouse_id == warehouse_id
    ).first()
    
    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found in this warehouse")

    update_data = location_update.model_dump(exclude_unset=True)
    
    # If code is being updated, check uniqueness
    if "code" in update_data and update_data["code"] != db_location.code:
        existing = db.query(location_models.StorageLocation).filter(
            location_models.StorageLocation.warehouse_id == warehouse_id,
            location_models.StorageLocation.code == update_data["code"]
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Location code already exists in this warehouse")
            
        # Update path if code changes
        parent_path = ""
        if db_location.parent_location_id:
             parent = db_location.parent
             parent_path = parent.path if parent and parent.path else ""
        
        new_path = f"{parent_path}/{update_data['code']}"
        db_location.path = new_path
        db_location.code = update_data["code"]
        
    for key, value in update_data.items():
        if key != "code": # code already handled
            setattr(db_location, key, value)
        
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@router.delete("/{warehouse_id}/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    warehouse_id: int,
    location_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete a location.
    Roles allowed: 1, 2.
    """
    check_write_permissions(current_user)
    
    db_location = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.id == location_id,
        location_models.StorageLocation.warehouse_id == warehouse_id
    ).first()
    
    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found in this warehouse")
        
    # Check if has children
    if db_location.children:
         raise HTTPException(status_code=400, detail="Cannot delete location with children. Delete children first.")
         
    db.delete(db_location)
    db.commit()
    return None
