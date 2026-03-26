from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc
from app.models.product import Product, ProductBatch
from app.models.inventory_refs import Category, Unit, Condition
from app.models.product_location_models import ProductLocationAssignment
from app.schemas.product import ProductCreate, ProductUpdate, ProductBatchCreate, ProductBatchUpdate
from app.schemas.inventory_refs import CategoryCreate, CategoryUpdate, UnitCreate, UnitUpdate, ConditionCreate, ConditionUpdate

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
    location_id: Optional[int] = None,
    brand: Optional[str] = None,
    order_by: Optional[str] = None,
    active_only: bool = False
) -> List[Product]:
    query = db.query(Product)
    
    if active_only:
        query = query.filter(Product.is_active == True)
    
    if location_id:
        query = query.join(ProductLocationAssignment, Product.id == ProductLocationAssignment.product_id)\
                     .filter(ProductLocationAssignment.location_id == location_id)\
                     .filter(ProductLocationAssignment.quantity > 0)

    if category_id:
        # Check for subcategories to include products from children categories
        subcategories = db.query(Category.id).filter(Category.parent_id == category_id).all()
        subcategory_ids = [s[0] for s in subcategories]
        
        if subcategory_ids:
            # Include parent + all children
            all_ids = [category_id] + subcategory_ids
            query = query.filter(Product.category_id.in_(all_ids))
        else:
            query = query.filter(Product.category_id == category_id)

    if brand:
        query = query.filter(Product.brand == brand)
        
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

import time

def create_product(db: Session, product: ProductCreate) -> Product:
    product_data = product.model_dump()
    if not product_data.get("sku"):
        # Auto-generate SKU: SKU-{TIMESTAMP}-{RANDOM_SUFFIX} or just timestamp
        # Using timestamp for simplicity and basic uniqueness
        product_data["sku"] = f"SKU-{int(time.time() * 1000)}"
        
    db_product = Product(**product_data)
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
        # No actualizar SKU si es None o vacío (es NOT NULL)
        if field == 'sku' and (value is None or value == ''):
            continue
        # Preservar valores existentes si el nuevo valor es None
        if value is None:
            continue
        setattr(db_product, field, value)
        
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def get_brands(db: Session, category_id: Optional[int] = None) -> List[str]:
    query = db.query(Product.brand).distinct().filter(Product.brand != None)
    
    if category_id:
        subcategories = db.query(Category.id).filter(Category.parent_id == category_id).all()
        subcategory_ids = [s[0] for s in subcategories]
        if subcategory_ids:
             all_ids = [category_id] + subcategory_ids
             query = query.filter(Product.category_id.in_(all_ids))
        else:
             query = query.filter(Product.category_id == category_id)
             
    return [r[0] for r in query.all() if r[0]]

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

def delete_batch(db: Session, batch_id: int) -> bool:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return False
    
    db.delete(db_batch)
    db.commit()
    return True


# --- Category CRUD Operations ---

def get_category(db: Session, category_id: int) -> Optional[Category]:
    return db.query(Category).filter(Category.id == category_id).first()

def get_categories(db: Session, skip: int = 0, limit: int = 100) -> List[Category]:
    return db.query(Category).offset(skip).limit(limit).all()

def create_category(db: Session, category: CategoryCreate) -> Category:
    db_category = Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def update_category(db: Session, category_id: int, category_in: CategoryUpdate) -> Optional[Category]:
    db_category = get_category(db, category_id)
    if not db_category:
        return None
    
    update_data = category_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)
        
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def delete_category(db: Session, category_id: int) -> Optional[Category]:
    db_category = get_category(db, category_id)
    if not db_category:
        return None
    
    db.delete(db_category)
    db.commit()
    return db_category

# --- Unit CRUD Operations ---

def get_unit(db: Session, unit_id: int) -> Optional[Unit]:
    return db.query(Unit).filter(Unit.id == unit_id).first()

def get_units(db: Session, skip: int = 0, limit: int = 100) -> List[Unit]:
    return db.query(Unit).offset(skip).limit(limit).all()

def create_unit(db: Session, unit: UnitCreate) -> Unit:
    db_unit = Unit(**unit.model_dump())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

def update_unit(db: Session, unit_id: int, unit_in: UnitUpdate) -> Optional[Unit]:
    db_unit = get_unit(db, unit_id)
    if not db_unit:
        return None
    
    update_data = unit_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_unit, field, value)
        
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

def delete_unit(db: Session, unit_id: int) -> Optional[Unit]:
    db_unit = get_unit(db, unit_id)
    if not db_unit:
        return None
    
    db.delete(db_unit)
    db.commit()
    return db_unit


# --- Condition CRUD Operations ---

def get_condition(db: Session, condition_id: int) -> Optional[Condition]:
    return db.query(Condition).filter(Condition.id == condition_id).first()

def get_condition_by_name(db: Session, name: str) -> Optional[Condition]:
    return db.query(Condition).filter(Condition.name == name).first()

def get_conditions(db: Session, skip: int = 0, limit: int = 100, include_inactive: bool = False) -> List[Condition]:
    query = db.query(Condition)
    if not include_inactive:
        query = query.filter(Condition.is_active == True)
    return query.offset(skip).limit(limit).all()

def create_condition(db: Session, condition: ConditionCreate) -> Condition:
    db_condition = Condition(**condition.model_dump())
    db.add(db_condition)
    db.commit()
    db.refresh(db_condition)
    return db_condition

def update_condition(db: Session, condition_id: int, condition_in: ConditionUpdate) -> Optional[Condition]:
    db_condition = get_condition(db, condition_id)
    if not db_condition:
        return None
    
    update_data = condition_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_condition, field, value)
        
    db.add(db_condition)
    db.commit()
    db.refresh(db_condition)
    return db_condition

def delete_condition(db: Session, condition_id: int) -> Optional[Condition]:
    db_condition = get_condition(db, condition_id)
    if not db_condition:
        return None
    
    # Soft delete
    db_condition.is_active = False
    db.add(db_condition)
    db.commit()
    db.refresh(db_condition)
    return db_condition
