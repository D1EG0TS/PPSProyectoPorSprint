from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.location import StorageLocationResponse

# Warehouse Schemas
class WarehouseBase(BaseModel):
    code: str
    name: str
    location: Optional[str] = None
    is_active: bool = True

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(WarehouseBase):
    code: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None

class Warehouse(WarehouseBase):
    id: int
    created_by: int
    # locations removed to avoid performance issues and validation errors in list view
    
    model_config = ConfigDict(from_attributes=True)

class WarehouseDetail(Warehouse):
    locations: List[StorageLocationResponse] = []

class WarehouseStockItem(BaseModel):
    product_id: int
    quantity: int

Warehouse.model_rebuild()
WarehouseDetail.model_rebuild()
