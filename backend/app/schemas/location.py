from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict
from app.models.location_models import LocationType

class StorageLocationBase(BaseModel):
    warehouse_id: Optional[int] = None
    parent_location_id: Optional[int] = None
    code: str
    name: str
    location_type: LocationType = LocationType.SHELF
    
    # Coordinate fields
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    position: Optional[str] = None
    
    capacity: int = 0
    dimensions: Optional[Dict[str, Any]] = None
    temperature_zone: Optional[str] = None
    is_restricted: bool = False
    barcode: Optional[str] = None

class StorageLocationCreate(StorageLocationBase):
    pass

class StorageLocationUpdate(BaseModel):
    warehouse_id: Optional[int] = None
    parent_location_id: Optional[int] = None
    code: Optional[str] = None
    name: Optional[str] = None
    location_type: Optional[LocationType] = None
    
    # Coordinate fields
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    position: Optional[str] = None
    
    capacity: Optional[int] = None
    dimensions: Optional[Dict[str, Any]] = None
    temperature_zone: Optional[str] = None
    is_restricted: Optional[bool] = None
    barcode: Optional[str] = None

class StorageLocationResponse(StorageLocationBase):
    id: int
    warehouse_id: int
    path: Optional[str] = None
    current_occupancy: int = 0
    
    children: List['StorageLocationResponse'] = [] 

    model_config = ConfigDict(from_attributes=True)
