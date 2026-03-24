from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud.movement import movement
from app.schemas import warehouse as schemas
from app.schemas import location as location_schemas
from app.models import warehouse as models
from app.models import location_models
from app.models import product_location_models
from app.models.user import User

router = APIRouter()

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
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "warehouses:view")),
):
    """
    List warehouses with pagination.
    Roles allowed: 1, 2, 3.
    """
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
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "warehouses:view")),
):
    """
    Get warehouse details.
    Roles allowed: 1, 2, 3.
    """
    warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse

@router.get("/{warehouse_id}/stock", response_model=List[schemas.WarehouseStockItem])
def read_warehouse_stock(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "warehouses:view")),
):
    """
    Get full stock inventory for a warehouse.
    """
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
        
    # Check if warehouse has stock (ProductLocationAssignment > 0)
    from app.models.product_location_models import ProductLocationAssignment
    has_stock = db.query(ProductLocationAssignment).filter(
        ProductLocationAssignment.warehouse_id == warehouse_id,
        ProductLocationAssignment.quantity > 0
    ).first()
    
    if has_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot delete warehouse with stock. Relocate items first."
        )

    db_warehouse.is_active = False
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse

@router.get("/{warehouse_id}/locations/tree", response_model=List[location_schemas.StorageLocationResponse])
def read_warehouse_locations_tree(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "warehouses:view")),
):
    """
    Get locations for a warehouse in tree structure.
    Roles allowed: 1, 2, 3.
    """
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
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "warehouses:view")),
):
    """
    Get locations for a warehouse.
    Roles allowed: 1, 2, 3.
    """
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
    
    # Generate code if not provided
    if not location.code:
        import uuid
        location.code = f"LOC-{str(uuid.uuid4())[:8].upper()}"

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


@router.post("/{warehouse_id}/locations/batch", response_model=location_schemas.BatchLocationResponse)
def create_locations_batch(
    warehouse_id: int,
    batch_data: location_schemas.BatchLocationCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create multiple locations at once.
    Useful for creating containers in bulk (e.g., C-001 to C-050).
    """
    check_write_permissions(current_user)
    
    warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    parent_path = ""
    if batch_data.parent_location_id:
        parent = db.query(location_models.StorageLocation).filter(
            location_models.StorageLocation.id == batch_data.parent_location_id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent location not found")
        if parent.warehouse_id != warehouse_id:
            raise HTTPException(status_code=400, detail="Parent location belongs to a different warehouse")
        parent_path = parent.path or ""
    
    created_locations = []
    errors = []
    
    for i in range(batch_data.count):
        number = batch_data.start_number + i
        code = f"{batch_data.prefix}{number:03d}"
        name = batch_data.name_template.replace("{n}", str(number)).replace("{n:02d}", f"{number:02d}").replace("{n:03d}", f"{number:03d}")
        barcode = f"{batch_data.barcode_prefix}{number:03d}" if batch_data.barcode_prefix else None
        position = f"{batch_data.position_prefix}{number}" if batch_data.position_prefix else str(number)
        
        existing = db.query(location_models.StorageLocation).filter(
            location_models.StorageLocation.warehouse_id == warehouse_id,
            location_models.StorageLocation.code == code
        ).first()
        
        if existing:
            errors.append(f"Code {code} already exists, skipping")
            continue
        
        if barcode:
            existing_barcode = db.query(location_models.StorageLocation).filter(
                location_models.StorageLocation.barcode == barcode
            ).first()
            if existing_barcode:
                errors.append(f"Barcode {barcode} already exists, skipping")
                continue
        
        db_location = location_models.StorageLocation(
            warehouse_id=warehouse_id,
            parent_location_id=batch_data.parent_location_id,
            code=code,
            name=name,
            location_type=batch_data.location_type,
            aisle=batch_data.aisle,
            rack=batch_data.rack,
            shelf=batch_data.shelf,
            position=position,
            capacity=batch_data.capacity,
            barcode=barcode,
            path=f"{parent_path}/{code}" if parent_path else code
        )
        db.add(db_location)
        created_locations.append(db_location)
    
    db.commit()
    
    for loc in created_locations:
        db.refresh(loc)
    
    return location_schemas.BatchLocationResponse(
        created=len(created_locations),
        locations=created_locations,
        errors=errors
    )


@router.post("/{warehouse_id}/locations/{location_id}/duplicate", response_model=location_schemas.StorageLocationResponse)
def duplicate_location(
    warehouse_id: int,
    location_id: int,
    new_code: str = Query(..., description="New code for the duplicated location"),
    new_name: Optional[str] = Query(None, description="New name (optional, defaults to original)"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Duplicate an existing location with a new code.
    Does not copy children - only the location itself.
    """
    check_write_permissions(current_user)
    
    original = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.id == location_id,
        location_models.StorageLocation.warehouse_id == warehouse_id
    ).first()
    
    if not original:
        raise HTTPException(status_code=404, detail="Location not found")
    
    existing = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.warehouse_id == warehouse_id,
        location_models.StorageLocation.code == new_code
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Location code already exists")
    
    parent_path = ""
    if original.parent_location_id:
        parent = original.parent
        parent_path = parent.path if parent and parent.path else ""
    
    db_location = location_models.StorageLocation(
        warehouse_id=warehouse_id,
        parent_location_id=original.parent_location_id,
        code=new_code,
        name=new_name or f"{original.name} (copia)",
        location_type=original.location_type,
        aisle=original.aisle,
        rack=original.rack,
        shelf=original.shelf,
        position=original.position,
        capacity=original.capacity,
        dimensions=original.dimensions,
        temperature_zone=original.temperature_zone,
        is_restricted=original.is_restricted,
        path=f"{parent_path}/{new_code}" if parent_path else new_code
    )
    
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


@router.get("/{warehouse_id}/locations/hierarchy", response_model=location_schemas.LocationHierarchyResponse)
def get_location_hierarchy(
    warehouse_id: int,
    aisle: Optional[str] = Query(None, description="Filter by aisle"),
    rack: Optional[str] = Query(None, description="Filter by rack"),
    shelf: Optional[str] = Query(None, description="Filter by shelf"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "warehouses:view")),
):
    """
    Get hierarchical location data for dropdown selectors.
    Returns unique values for each level, filtered by parent selections.
    """
    warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    query = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.warehouse_id == warehouse_id
    )
    
    if aisle:
        query = query.filter(location_models.StorageLocation.aisle == aisle)
    if rack:
        query = query.filter(location_models.StorageLocation.rack == rack)
    if shelf:
        query = query.filter(location_models.StorageLocation.shelf == shelf)
    
    locations = query.all()
    
    aisles = sorted(set(loc.aisle for loc in locations if loc.aisle))
    racks = sorted(set(loc.rack for loc in locations if loc.rack))
    shelves = sorted(set(loc.shelf for loc in locations if loc.shelf))
    positions = sorted(set(loc.position for loc in locations if loc.position))
    
    return location_schemas.LocationHierarchyResponse(
        aisles=aisles,
        racks=racks,
        shelves=shelves,
        positions=positions
    )


@router.get("/{warehouse_id}/locations/children", response_model=List[location_schemas.StorageLocationResponse])
def get_location_children(
    warehouse_id: int,
    parent_id: Optional[int] = Query(None, description="Parent location ID (null for root)"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "warehouses:view")),
):
    """
    Get direct children of a location.
    Useful for tree view expansion.
    """
    warehouse = db.query(models.Warehouse).filter(models.Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    query = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.warehouse_id == warehouse_id
    )
    
    if parent_id is None:
        query = query.filter(location_models.StorageLocation.parent_location_id == None)
    else:
        query = query.filter(location_models.StorageLocation.parent_location_id == parent_id)
    
    return query.all()


@router.get("/locations/check-container")
def check_container_availability(
    container_code: str = Query(..., description="Container code to check"),
    exclude_product_id: Optional[int] = Query(None, description="Product ID to exclude from check"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles_with_permission([1, 2, 3], "warehouses:view")),
):
    """
    Check if a container is available or occupied.
    Returns current contents if occupied.
    """
    location = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.code == container_code
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail="Container not found")
    
    assignment = db.query(product_location_models.ProductLocationAssignment).filter(
        product_location_models.ProductLocationAssignment.location_id == location.id,
        product_location_models.ProductLocationAssignment.quantity > 0
    ).first()
    
    if assignment and assignment.product_id == exclude_product_id:
        remaining = location.capacity - assignment.quantity if location.capacity > 0 else None
        return location_schemas.ContainerCheckResponse(
            available=True,
            current_product_id=assignment.product_id,
            current_quantity=assignment.quantity,
            remaining_capacity=remaining,
            location_id=location.id,
            location_code=location.code
        )
    
    if assignment:
        from app.models.product import Product
        product = db.query(Product).filter(Product.id == assignment.product_id).first()
        return location_schemas.ContainerCheckResponse(
            available=False,
            current_product=product.name if product else f"Producto #{assignment.product_id}",
            current_product_id=assignment.product_id,
            current_quantity=assignment.quantity,
            remaining_capacity=None,
            location_id=location.id,
            location_code=location.code
        )
    
    remaining = location.capacity if location.capacity > 0 else None
    return location_schemas.ContainerCheckResponse(
        available=True,
        remaining_capacity=remaining,
        location_id=location.id,
        location_code=location.code
    )
