from typing import List, Optional
from pydantic import BaseModel, ConfigDict, computed_field
from datetime import date
from decimal import Decimal
from app.core.config import settings

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
    sku: Optional[str] = None # Made optional for base, required for Product response
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    image_url: Optional[str] = None
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
    brand: Optional[str] = None
    model: Optional[str] = None
    image_url: Optional[str] = None
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
    sku: str # Enforce SKU presence in response
    cost: Optional[Decimal] = None
    price: Optional[Decimal] = None
    batches: List[ProductBatch] = []

    @computed_field
    def full_image_url(self) -> Optional[str]:
        if self.image_url:
            if self.image_url.startswith("http"):
                return self.image_url
            return f"{settings.BACKEND_URL}/{self.image_url}"
        return None

    model_config = ConfigDict(from_attributes=True)
