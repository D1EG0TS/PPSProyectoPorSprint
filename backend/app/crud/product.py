from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc
from app.models.product import Product, ProductBatch
from app.models.inventory_refs import Category, Unit
from app.schemas.product import ProductCreate, ProductUpdate, ProductBatchCreate, ProductBatchUpdate

def get_product(db: Session, product_id: int) -> Optional[Product]:
    return db.query(Product).filter(Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str) -> Optional[Product]:
    return db.query(Product).filter(Product.sku == sku).first()

def get_product_by_barcode(db: Session, barcode: str) -> Optional[Product]:
    if not barcode:
        return None
    return db.query(Product).filter(Product.barcode == barcode).first()

def get_products(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    order_by: Optional[str] = None,
    active_only: bool = False
) -> List[Product]:
    query = db.query(Product)
    
    if active_only:
        query = query.filter(Product.is_active == True)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
        
    if search:
        search_filter = or_(
            Product.name.ilike(f"%{search}%"),
            Product.sku.ilike(f"%{search}%"),
            Product.barcode.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if order_by:
        if order_by == "name_asc":
            query = query.order_by(asc(Product.name))
        elif order_by == "name_desc":
            query = query.order_by(desc(Product.name))
        elif order_by == "price_asc":
            query = query.order_by(asc(Product.price))
        elif order_by == "price_desc":
            query = query.order_by(desc(Product.price))
    else:
        # Default sort by ID desc (newest first)
        query = query.order_by(desc(Product.id))
        
    return query.offset(skip).limit(limit).all()

def create_product(db: Session, product: ProductCreate) -> Product:
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product_in: ProductUpdate) -> Optional[Product]:
    db_product = get_product(db, product_id)
    if not db_product:
        return None
        
    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)
        
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int) -> Optional[Product]:
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    
    # Soft delete
    db_product.is_active = False
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

# --- Batch CRUD Operations ---

def get_batch(db: Session, batch_id: int) -> Optional[ProductBatch]:
    return db.query(ProductBatch).filter(ProductBatch.id == batch_id).first()

def get_batches_by_product(db: Session, product_id: int, skip: int = 0, limit: int = 100) -> List[ProductBatch]:
    return db.query(ProductBatch).filter(ProductBatch.product_id == product_id).offset(skip).limit(limit).all()

def create_batch(db: Session, product_id: int, batch: ProductBatchCreate) -> ProductBatch:
    db_batch = ProductBatch(**batch.model_dump(), product_id=product_id)
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch

def update_batch(db: Session, batch_id: int, batch_in: ProductBatchUpdate) -> Optional[ProductBatch]:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return None
        
    update_data = batch_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_batch, field, value)
        
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


def get_categories(db: Session, skip: int = 0, limit: int = 100) -> List[Category]:
    return db.query(Category).offset(skip).limit(limit).all()

def get_units(db: Session, skip: int = 0, limit: int = 100) -> List[Unit]:
    return db.query(Unit).offset(skip).limit(limit).all()
