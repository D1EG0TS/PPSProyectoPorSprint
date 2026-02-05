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

@router.get("/", response_model=List[product_schemas.Product])
def read_products(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
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
        db, skip=skip, limit=limit, search=search, category_id=category_id, order_by=order_by, active_only=not include_inactive
    )
    return filter_sensitive_data(products, current_user)

@router.post("/", response_model=product_schemas.Product)
def create_product(
    product_in: product_schemas.ProductCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create new product.
    """
    check_permissions(current_user)
    
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
