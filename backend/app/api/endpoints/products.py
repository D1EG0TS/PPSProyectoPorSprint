from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import product as crud_product
from app.crud.movement import movement
from app.schemas import product as product_schemas
from app.schemas.movement import Movement as MovementSchema
from app.schemas import inventory_refs as ref_schemas
from app.models.user import User
from app.models import product_location_models, location_models, location_audit_models
from app.schemas import product_location as assignment_schemas


router = APIRouter()

def filter_sensitive_data(products: List[product_schemas.Product], user: User) -> List[product_schemas.Product]:
    """
    Filter out sensitive data (cost, price) for users with role ID 5.
    """
    if user.role_id == 5:
        for product in products:
            product.cost = None
            product.price = None
    return products

def filter_sensitive_data_single(product: product_schemas.Product, user: User) -> product_schemas.Product:
    """
    Filter out sensitive data (cost, price) for a single product if user has role ID 5.
    """
    if user.role_id == 5:
        product.cost = None
        product.price = None
    return product

def check_permissions(user: User, min_level: int = 30):
    """
    Check if user has enough permissions (based on role level).
    Default min_level 30 (Manager) for write operations.
    """
    if not user.role or user.role.level < min_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

@router.get("/brands", response_model=List[str])
def read_brands(
    category_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Retrieve unique brands, optionally filtered by category.
    """
    return crud_product.get_brands(db, category_id=category_id)

@router.get("/", response_model=List[product_schemas.Product])
def read_products(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    location_id: Optional[int] = None,
    brand: Optional[str] = None,
    order_by: Optional[str] = None,
    include_inactive: bool = False,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Retrieve products.
    """
    # Only Admin/Manager can see inactive products
    if include_inactive and (not current_user.role or current_user.role.id > 3):
        include_inactive = False

    products = crud_product.get_products(
        db, skip=skip, limit=limit, search=search, category_id=category_id, location_id=location_id, brand=brand, order_by=order_by, active_only=not include_inactive
    )
    return filter_sensitive_data(products, current_user)

@router.post("/", response_model=product_schemas.Product)
def create_product(
    product_in: product_schemas.ProductCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_permission("inventory:create")),
):
    """
    Create new product.
    Requires 'inventory:create' permission.
    """
    # Validations
    if crud_product.get_product_by_sku(db, sku=product_in.sku):
        raise HTTPException(status_code=400, detail="The product with this SKU already exists")
    
    if product_in.barcode and crud_product.get_product_by_barcode(db, barcode=product_in.barcode):
        raise HTTPException(status_code=400, detail="The product with this Barcode already exists")
        
    product = crud_product.create_product(db, product=product_in)
    return product

@router.put("/{id}", response_model=product_schemas.Product)
def update_product(
    id: int,
    product_in: product_schemas.ProductUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update a product.
    """
    check_permissions(current_user)
    
    product = crud_product.get_product(db, product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Validations for unique fields if they are being updated
    if product_in.sku and product_in.sku != product.sku:
        if crud_product.get_product_by_sku(db, sku=product_in.sku):
             raise HTTPException(status_code=400, detail="The product with this SKU already exists")

    if product_in.barcode and product_in.barcode != product.barcode:
        if crud_product.get_product_by_barcode(db, barcode=product_in.barcode):
             raise HTTPException(status_code=400, detail="The product with this Barcode already exists")
             
    product = crud_product.update_product(db, product_id=id, product_in=product_in)
    return product

@router.delete("/{id}", response_model=product_schemas.Product)
def delete_product(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete (deactivate) a product.
    """
    check_permissions(current_user) # Only Admin/Manager
    
    product = crud_product.get_product(db, product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product = crud_product.delete_product(db, product_id=id)
    return product

@router.get("/{id}/batches", response_model=List[product_schemas.ProductBatch])
def read_product_batches(
    id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get batches for a product.
    """
    product = crud_product.get_product(db, product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    batches = crud_product.get_batches_by_product(db, product_id=id, skip=skip, limit=limit)
    return batches

@router.post("/{id}/batches", response_model=product_schemas.ProductBatch)
def create_product_batch(
    id: int,
    batch_in: product_schemas.ProductBatchCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create a batch for a product.
    """
    check_permissions(current_user)
    
    product = crud_product.get_product(db, product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # If product doesn't have batch tracking enabled, maybe we should enable it or warn?
    # For now, we assume if they are creating a batch, they want to use batches.
    
    # Validation: If product has expiration, batch must have expiration date
    if product.has_expiration and not batch_in.expiration_date:
        raise HTTPException(
            status_code=400, 
            detail="Expiration date is required for this product type"
        )

    batch = crud_product.create_batch(db, product_id=id, batch=batch_in)
    return batch

@router.put("/batches/{id}", response_model=product_schemas.ProductBatch)
def update_product_batch(
    id: int,
    batch_in: product_schemas.ProductBatchUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update a batch.
    """
    check_permissions(current_user)
    
    batch = crud_product.get_batch(db, batch_id=id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    batch = crud_product.update_batch(db, batch_id=id, batch_in=batch_in)
    return batch

@router.get("/scan/{code}", response_model=product_schemas.Product)
def scan_product(
    code: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get product by SKU or Barcode.
    """
    product = crud_product.get_product_by_sku(db, sku=code)
    if not product:
        product = crud_product.get_product_by_barcode(db, barcode=code)
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    return filter_sensitive_data_single(product, current_user)

@router.get("/categories/", response_model=List[ref_schemas.Category])
def read_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Retrieve product categories.
    """
    return crud_product.get_categories(db, skip=skip, limit=limit)

@router.post("/categories/", response_model=ref_schemas.Category)
def create_category(
    category_in: ref_schemas.CategoryCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create a new category.
    """
    check_permissions(current_user)
    return crud_product.create_category(db, category=category_in)

@router.put("/categories/{id}", response_model=ref_schemas.Category)
def update_category(
    id: int,
    category_in: ref_schemas.CategoryUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update a category.
    """
    check_permissions(current_user)
    category = crud_product.get_category(db, category_id=id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return crud_product.update_category(db, category_id=id, category_in=category_in)

@router.delete("/categories/{id}", response_model=ref_schemas.Category)
def delete_category(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete a category.
    """
    check_permissions(current_user)
    category = crud_product.get_category(db, category_id=id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return crud_product.delete_category(db, category_id=id)

@router.get("/units/", response_model=List[ref_schemas.Unit])
def read_units(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Retrieve product units.
    """
    return crud_product.get_units(db, skip=skip, limit=limit)

@router.post("/units/", response_model=ref_schemas.Unit)
def create_unit(
    unit_in: ref_schemas.UnitCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create a new unit.
    """
    check_permissions(current_user)
    return crud_product.create_unit(db, unit=unit_in)

@router.put("/units/{id}", response_model=ref_schemas.Unit)
def update_unit(
    id: int,
    unit_in: ref_schemas.UnitUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update a unit.
    """
    check_permissions(current_user)
    unit = crud_product.get_unit(db, unit_id=id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return crud_product.update_unit(db, unit_id=id, unit_in=unit_in)

@router.delete("/units/{id}", response_model=ref_schemas.Unit)
def delete_unit(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete a unit.
    """
    check_permissions(current_user)
    unit = crud_product.get_unit(db, unit_id=id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return crud_product.delete_unit(db, unit_id=id)

@router.get("/{id}", response_model=product_schemas.Product)
def read_product(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get product by ID.
    """
    product = crud_product.get_product(db, product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return filter_sensitive_data_single(product, current_user)

@router.get("/{id}/ledger", response_model=List[MovementSchema])
def read_product_ledger(
    id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get ledger (movements history) for a product.
    """
    product = crud_product.get_product(db, product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    ledger = movement.get_ledger(db, product_id=id, skip=skip, limit=limit)
    return ledger

@router.post("/{product_id}/locations", response_model=assignment_schemas.ProductLocationAssignmentResponse)
def assign_product_location(
    product_id: int,
    assignment: assignment_schemas.ProductLocationAssignmentCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Assign product to a specific location.
    """
    check_permissions(current_user) # Ensure write access
    
    # Verify product
    product = crud_product.get_product(db, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Verify location
    location = db.query(location_models.StorageLocation).filter(location_models.StorageLocation.id == assignment.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
        
    # Create assignment
    db_assignment = product_location_models.ProductLocationAssignment(
        **assignment.model_dump(exclude={"product_id", "assigned_by"}),
        product_id=product_id,
        assigned_by=current_user.id
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.put("/{product_id}/locations/{assignment_id}", response_model=assignment_schemas.ProductLocationAssignmentResponse)
def update_product_location_assignment(
    product_id: int,
    assignment_id: int,
    assignment_update: assignment_schemas.ProductLocationAssignmentUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update product location assignment (e.g., quantity).
    """
    check_permissions(current_user)
    
    db_assignment = db.query(product_location_models.ProductLocationAssignment).filter(
        product_location_models.ProductLocationAssignment.id == assignment_id,
        product_location_models.ProductLocationAssignment.product_id == product_id
    ).first()
    
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    update_data = assignment_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_assignment, key, value)
        
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.delete("/{product_id}/locations/{assignment_id}")
def delete_product_location_assignment(
    product_id: int,
    assignment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Remove product location assignment.
    """
    check_permissions(current_user)
    
    db_assignment = db.query(product_location_models.ProductLocationAssignment).filter(
        product_location_models.ProductLocationAssignment.id == assignment_id,
        product_location_models.ProductLocationAssignment.product_id == product_id
    ).first()
    
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    db.delete(db_assignment)
    db.commit()
    return {"ok": True}

@router.get("/{product_id}/locations/all", response_model=List[assignment_schemas.ProductLocationAssignmentResponse])
def get_product_locations(
    product_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get all location assignments for a product.
    """
    # Verify product
    product = crud_product.get_product(db, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    assignments = db.query(product_location_models.ProductLocationAssignment).filter(
        product_location_models.ProductLocationAssignment.product_id == product_id
    ).all()
    return assignments

@router.post("/{product_id}/relocate")
def relocate_product(
    product_id: int,
    relocation: assignment_schemas.ProductRelocationRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Relocate product from one location to another.
    """
    check_permissions(current_user)
    
    # 1. Check source assignment
    source = db.query(product_location_models.ProductLocationAssignment).filter(
        product_location_models.ProductLocationAssignment.location_id == relocation.from_location_id,
        product_location_models.ProductLocationAssignment.product_id == product_id
    ).first()
    
    if not source or source.quantity < relocation.quantity:
        raise HTTPException(status_code=400, detail="Insufficient quantity in source location")
        
    # 2. Check destination location
    dest_loc = db.query(location_models.StorageLocation).filter(
        location_models.StorageLocation.id == relocation.to_location_id
    ).first()
    
    if not dest_loc:
        raise HTTPException(status_code=404, detail="Destination location not found")
        
    # 3. Update Source
    source.quantity -= relocation.quantity
    if source.quantity == 0:
        db.delete(source) # Optional: keep with 0 or delete
    else:
        db.add(source)
        
    # 4. Update/Create Destination
    dest = db.query(product_location_models.ProductLocationAssignment).filter(
        product_location_models.ProductLocationAssignment.location_id == relocation.to_location_id,
        product_location_models.ProductLocationAssignment.product_id == product_id,
        # Match batch if applicable, assuming None for now or handle in schema
    ).first()
    
    if dest:
        dest.quantity += relocation.quantity
        db.add(dest)
    else:
        dest = product_location_models.ProductLocationAssignment(
            product_id=product_id,
            location_id=relocation.to_location_id,
            warehouse_id=dest_loc.warehouse_id,
            quantity=relocation.quantity,
            assigned_by=current_user.id,
            assignment_type="movement" # or manual
        )
        db.add(dest)
        
    # 5. Log Audit
    audit = location_audit_models.LocationAuditLog(
        location_id=relocation.from_location_id,
        product_id=product_id,
        action="relocation_out",
        previous_quantity=source.quantity + relocation.quantity,
        new_quantity=source.quantity,
        user_id=current_user.id
    )
    db.add(audit)
    
    audit_in = location_audit_models.LocationAuditLog(
        location_id=relocation.to_location_id,
        product_id=product_id,
        action="relocation_in",
        previous_quantity=dest.quantity - relocation.quantity if dest.id else 0, # roughly
        new_quantity=dest.quantity,
        user_id=current_user.id
    )
    db.add(audit_in)
    
    db.commit()
    return {"message": "Relocation successful"}
