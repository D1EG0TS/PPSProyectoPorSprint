from typing import Optional, List
from pydantic import BaseModel

# Location Schemas
class LocationBase(BaseModel):
    code: str
    name: str
    parent_location_id: Optional[int] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(LocationBase):
    code: Optional[str] = None
    name: Optional[str] = None

class Location(LocationBase):
    id: int
    warehouse_id: int
    path: Optional[str] = None
    children: List['Location'] = []

    class Config:
        from_attributes = True

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
    locations: List[Location] = []

    class Config:
        from_attributes = True

class WarehouseStockItem(BaseModel):
    product_id: int
    quantity: int

Location.model_rebuild()
Warehouse.model_rebuild()
