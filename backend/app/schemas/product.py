from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import date
from decimal import Decimal

# --- Product Batch Schemas ---

class ProductBatchBase(BaseModel):
    batch_number: str
    manufactured_date: Optional[date] = None
    expiration_date: Optional[date] = None
    quantity: int = 0

class ProductBatchCreate(ProductBatchBase):
    pass

class ProductBatchUpdate(ProductBatchBase):
    batch_number: Optional[str] = None
    quantity: Optional[int] = None

class ProductBatch(ProductBatchBase):
    id: int
    product_id: int
    
    model_config = ConfigDict(from_attributes=True)

# --- Product Schemas ---

class ProductBase(BaseModel):
    sku: str
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    category_id: int
    unit_id: int
    cost: Decimal = Decimal('0.00')
    price: Decimal = Decimal('0.00')
    min_stock: int = 0
    target_stock: int = 0
    has_batch: bool = False
    has_expiration: bool = False
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    unit_id: Optional[int] = None
    cost: Optional[Decimal] = None
    price: Optional[Decimal] = None
    min_stock: Optional[int] = None
    target_stock: Optional[int] = None
    has_batch: Optional[bool] = None
    has_expiration: Optional[bool] = None
    is_active: Optional[bool] = None

class Product(ProductBase):
    id: int
    cost: Optional[Decimal] = None
    price: Optional[Decimal] = None
    batches: List[ProductBatch] = []

    model_config = ConfigDict(from_attributes=True)
