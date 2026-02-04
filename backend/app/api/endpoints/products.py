from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import product as crud_product
from app.schemas import product as product_schemas
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

@router.get("/", response_model=List[product_schemas.Product])
def read_products(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    order_by: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Retrieve products.
    """
    products = crud_product.get_products(
        db, skip=skip, limit=limit, search=search, category_id=category_id, order_by=order_by
    )
    return filter_sensitive_data(products, current_user)

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
