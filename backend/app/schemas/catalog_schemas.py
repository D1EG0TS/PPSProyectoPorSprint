from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal
from datetime import date, datetime

# --- Base Schemas ---

class CatalogCategory(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class CatalogUnit(BaseModel):
    id: int
    name: str
    abbreviation: str
    model_config = ConfigDict(from_attributes=True)

class CatalogLocation(BaseModel):
    warehouse_name: str
    location_code: str
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    position: Optional[str] = None
    quantity: int
    batch_number: Optional[str] = None

# --- Tier 1: Public Catalog (Guest / Role 5) ---
class PublicCatalogItem(BaseModel):
    id: int
    sku: str
    name: str
    description: Optional[str] = None
    category: Optional[CatalogCategory] = None
    unit: Optional[CatalogUnit] = None
    barcode: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    image_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Tier 2: Operational Catalog (Operational / Role 4) ---
class OperationalCatalogItem(PublicCatalogItem):
    total_stock: int = 0
    available_stock: int = 0
    can_add_to_request: bool = True

# --- Tier 3: Internal Catalog (Moderator / Role 3) ---
class StockByWarehouse(BaseModel):
    warehouse_id: int
    warehouse_name: str
    quantity: int

class InternalCatalogItem(OperationalCatalogItem):
    stock_by_warehouse: List[StockByWarehouse] = []
    locations: List[CatalogLocation] = []  # Added exact locations for Moderators
    min_stock: int = 0
    needs_reorder: bool = False

# --- Tier 4: Admin Catalog (Admin, SuperAdmin / Role 1-2) ---
class AdminCatalogItem(InternalCatalogItem):
    # locations inherited from InternalCatalogItem
    cost: Decimal = Decimal('0.00')
    price: Decimal = Decimal('0.00')
    last_movement_date: Optional[datetime] = None
    supplier_info: Optional[str] = None
