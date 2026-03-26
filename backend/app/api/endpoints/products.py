from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from app.api import deps
from app.crud import product as crud_product
from app.utils.file_storage import save_product_image
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

@router.post("/", response_model=product_schemas.Product, status_code=status.HTTP_201_CREATED)
def create_product(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_permission("inventory:create")),
    sku: str = Form(...),
    name: str = Form(...),
    category_id: int = Form(...),
    unit_id: int = Form(...),
    barcode: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    cost: Decimal = Form(Decimal('0.00')),
    price: Decimal = Form(Decimal('0.00')),
    min_stock: int = Form(0),
    target_stock: int = Form(0),
    has_batch: bool = Form(False),
    has_expiration: bool = Form(False),
    is_active: bool = Form(True),
    image_url: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
):
    """
    Create new product.
    Requires 'inventory:create' permission.
    Supports multipart/form-data for image upload.
    """
    # Construct ProductCreate schema manually from form data
    product_in = product_schemas.ProductCreate(
        sku=sku,
        name=name,
        category_id=category_id,
        unit_id=unit_id,
        barcode=barcode,
        description=description,
        brand=brand,
        model=model,
        cost=cost,
        price=price,
        min_stock=min_stock,
        target_stock=target_stock,
        has_batch=has_batch,
        has_expiration=has_expiration,
        is_active=is_active,
        image_url=image_url
    )

    # Validations
    if crud_product.get_product_by_sku(db, sku=product_in.sku):
        raise HTTPException(status_code=400, detail="The product with this SKU already exists")
    
    if product_in.barcode and crud_product.get_product_by_barcode(db, barcode=product_in.barcode):
        raise HTTPException(status_code=400, detail="The product with this Barcode already exists")
        
    # Handle Image Upload if present
    if image:
        try:
            file_path = save_product_image(image)
            product_in.image_url = file_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

    product = crud_product.create_product(db, product=product_in)
    return product

@router.put("/{id}/json", response_model=product_schemas.Product)
def update_product_json(
    id: int,
    product_in: product_schemas.ProductUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_permission("inventory:update")),
):
    """
    Update a product using JSON body.
    """
    product = crud_product.get_product(db, product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated = crud_product.update_product(db, product_id=id, product_in=product_in)
    return updated

@router.put("/{id}", response_model=product_schemas.Product)
def update_product(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.check_permission("inventory:update")),
    sku: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    unit_id: Optional[int] = Form(None),
    barcode: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    cost: Optional[Decimal] = Form(None),
    price: Optional[Decimal] = Form(None),
    min_stock: Optional[int] = Form(None),
    target_stock: Optional[int] = Form(None),
    has_batch: Optional[bool] = Form(None),
    has_expiration: Optional[bool] = Form(None),
    is_active: Optional[bool] = Form(None),
    image_url: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
):
    """
    Update a product.
    Supports multipart/form-data for image upload.
    """
    product = crud_product.get_product(db, product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Construct ProductUpdate schema manually
    product_in = product_schemas.ProductUpdate(
        sku=sku,
        name=name,
        category_id=category_id,
        unit_id=unit_id,
        barcode=barcode,
        description=description,
        brand=brand,
        model=model,
        cost=cost,
        price=price,
        min_stock=min_stock,
        target_stock=target_stock,
        has_batch=has_batch,
        has_expiration=has_expiration,
        is_active=is_active,
        image_url=image_url
    )
        
    # Validations for unique fields if they are being updated
    if product_in.sku and product_in.sku != product.sku:
        if crud_product.get_product_by_sku(db, sku=product_in.sku):
             raise HTTPException(status_code=400, detail="The product with this SKU already exists")

    if product_in.barcode and product_in.barcode != product.barcode:
        if crud_product.get_product_by_barcode(db, barcode=product_in.barcode):
             raise HTTPException(status_code=400, detail="The product with this Barcode already exists")
    
    # Handle Image Upload if present
    if image:
        try:
            file_path = save_product_image(image)
            product_in.image_url = file_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
             
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
    Only Admin (Level 50+) can delete.
    """
    check_permissions(current_user, min_level=50) # Only Admin/SuperAdmin
    
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
    
    # Validation: If product has batch tracking disabled, we still allow creating batches
    # but we warn. The has_batch flag on product is for UI display purposes.
    
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
    Update a batch. Allows updating batch_number, dates, and quantity.
    """
    check_permissions(current_user)
    
    batch = crud_product.get_batch(db, batch_id=id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Validation: If product has expiration, expiration_date is required
    if batch_in.expiration_date is None:
        product = crud_product.get_product(db, product_id=batch.product_id)
        if product and product.has_expiration:
            current_exp = batch_in.expiration_date if batch_in.expiration_date is not None else batch.expiration_date
            if not current_exp:
                raise HTTPException(
                    status_code=400,
                    detail="Expiration date is required for this product type"
                )
    
    batch = crud_product.update_batch(db, batch_id=id, batch_in=batch_in)
    return batch

@router.delete("/batches/{id}")
def delete_product_batch(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete a batch. Only allowed if batch quantity is 0 or user confirms.
    """
    check_permissions(current_user, min_level=50)
    
    batch = crud_product.get_batch(db, batch_id=id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.quantity > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete batch with quantity > 0. Current quantity: {batch.quantity}"
        )
    
    crud_product.delete_batch(db, batch_id=id)
    return {"success": True, "message": "Batch deleted successfully"}

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


# === CONDITION ENDPOINTS ===

@router.get("/conditions/", response_model=List[ref_schemas.Condition])
def read_conditions(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Retrieve product conditions.
    Only accessible by Admin (role 1) and SuperAdmin (role 2).
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage conditions"
        )
    return crud_product.get_conditions(db, skip=skip, limit=limit, include_inactive=include_inactive)


@router.post("/conditions/", response_model=ref_schemas.Condition, status_code=status.HTTP_201_CREATED)
def create_condition(
    condition_in: ref_schemas.ConditionCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create a new product condition.
    Only accessible by Admin (role 1) and SuperAdmin (role 2).
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage conditions"
        )
    
    existing = crud_product.get_condition_by_name(db, name=condition_in.name)
    if existing:
        raise HTTPException(status_code=400, detail="A condition with this name already exists")
    
    return crud_product.create_condition(db, condition=condition_in)


@router.put("/conditions/{id}", response_model=ref_schemas.Condition)
def update_condition(
    id: int,
    condition_in: ref_schemas.ConditionUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update a product condition.
    Only accessible by Admin (role 1) and SuperAdmin (role 2).
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage conditions"
        )
    
    condition = crud_product.get_condition(db, condition_id=id)
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")
    
    if condition_in.name and condition_in.name != condition.name:
        existing = crud_product.get_condition_by_name(db, name=condition_in.name)
        if existing:
            raise HTTPException(status_code=400, detail="A condition with this name already exists")
    
    return crud_product.update_condition(db, condition_id=id, condition_in=condition_in)


@router.delete("/conditions/{id}")
def delete_condition(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete a product condition (soft delete - sets is_active=False).
    Only accessible by Admin (role 1) and SuperAdmin (role 2).
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage conditions"
        )
    
    condition = crud_product.get_condition(db, condition_id=id)
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")
    
    return crud_product.delete_condition(db, condition_id=id)

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

@router.post("/{id}/image", response_model=product_schemas.Product)
def upload_product_image(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Upload product image.
    Only Admin/Manager (Level 30+) can upload images.
    """
    check_permissions(current_user, min_level=30)
    
    product = crud_product.get_product(db, product_id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    try:
        # Save file
        file_path = save_product_image(file)
        
        # Update product
        product.image_url = file_path
        db.add(product)
        db.commit()
        db.refresh(product)
        return product
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

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
        
    from app.services.stock_service import StockService
    # Use StockService to get LedgerEntry records instead of legacy Movement table
    ledger = StockService.get_stock_history(db, product_id=id)
    # Apply pagination manually or adjust get_stock_history if needed
    ledger = ledger[skip:skip+limit]
    
    # Map LedgerEntry to MovementSchema format
    result = []
    from app.models.ledger import LedgerEntryType
    for entry in ledger:
        # Determine movement type based on entry_type (INCREMENT -> IN, DECREMENT -> OUT)
        # Note: Transfer might be represented as two entries (OUT then IN)
        type_str = "IN" if entry.entry_type == LedgerEntryType.INCREMENT or entry.entry_type == "increment" else "OUT"
        
        result.append({
            "id": entry.id,
            "movement_request_id": entry.movement_request_id,
            "created_at": entry.applied_at,
            "type": type_str,
            "product_id": entry.product_id,
            "warehouse_id": entry.warehouse_id,
            "location_id": entry.location_id,
            "quantity": entry.quantity,
            "previous_balance": entry.previous_balance,
            "new_balance": entry.new_balance
        })
    return result

@router.post("/{product_id}/locations", response_model=assignment_schemas.ProductLocationAssignmentResponse)
def assign_product_location(
    product_id: int,
    assignment: assignment_schemas.ProductLocationAssignmentCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Assign product to a specific location.
    Checks for capacity and primary location logic.
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

    # Check capacity if defined
    if location.capacity is not None:
        # Calculate current usage
        current_usage = db.query(func.sum(product_location_models.ProductLocationAssignment.quantity)).filter(
            product_location_models.ProductLocationAssignment.location_id == assignment.location_id
        ).scalar() or 0
        
        if current_usage + assignment.quantity > location.capacity:
             raise HTTPException(status_code=400, detail=f"Location capacity exceeded. Available: {location.capacity - current_usage}")

    # Check/Set Primary Location
    if assignment.is_primary:
        # Unset other primary locations for this product
        existing_primary = db.query(product_location_models.ProductLocationAssignment).filter(
            product_location_models.ProductLocationAssignment.product_id == product_id,
            product_location_models.ProductLocationAssignment.is_primary == True
        ).update({"is_primary": False})
        
    # Check if assignment exists
    existing_assignment = db.query(product_location_models.ProductLocationAssignment).filter(
        product_location_models.ProductLocationAssignment.product_id == product_id,
        product_location_models.ProductLocationAssignment.location_id == assignment.location_id,
    ).first()

    if existing_assignment:
        existing_assignment.quantity += assignment.quantity
        if assignment.is_primary:
            existing_assignment.is_primary = True
        db.add(existing_assignment)
        db_assignment = existing_assignment
    else:
        # Create assignment
        db_assignment = product_location_models.ProductLocationAssignment(
            **assignment.model_dump(exclude={"product_id", "assigned_by"}),
            product_id=product_id,
            warehouse_id=location.warehouse_id,
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

    # Check capacity at destination
    if dest_loc.capacity is not None:
         current_usage = db.query(func.sum(product_location_models.ProductLocationAssignment.quantity)).filter(
            product_location_models.ProductLocationAssignment.location_id == relocation.to_location_id
         ).scalar() or 0
         if current_usage + relocation.quantity > dest_loc.capacity:
              raise HTTPException(status_code=400, detail=f"Destination capacity exceeded. Available: {dest_loc.capacity - current_usage}")
        
    # 3. Update Source
    source.quantity -= relocation.quantity
    
    # Audit for source
    audit = location_audit_models.LocationAuditLog(
        location_id=relocation.from_location_id,
        product_id=product_id,
        action="relocation_out",
        previous_quantity=source.quantity + relocation.quantity,
        new_quantity=source.quantity,
        user_id=current_user.id
    )
    db.add(audit)

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
    
    prev_qty = 0
    if dest:
        prev_qty = dest.quantity
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
    
    # Audit for destination
    audit_in = location_audit_models.LocationAuditLog(
        location_id=relocation.to_location_id,
        product_id=product_id,
        action="relocation_in",
        previous_quantity=prev_qty,
        new_quantity=prev_qty + relocation.quantity,
        user_id=current_user.id
    )
    db.add(audit_in)
    
    db.commit()
    return {"message": "Relocation successful"}
