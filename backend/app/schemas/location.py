from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field
from app.models.location_models import LocationType


class StorageLocationBase(BaseModel):
    warehouse_id: Optional[int] = None
    parent_location_id: Optional[int] = None
    code: Optional[str] = None
    name: str
    location_type: LocationType = LocationType.SHELF
    
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
    parent_location_id: Optional[int] = None
    code: Optional[str] = None
    name: Optional[str] = None
    location_type: Optional[LocationType] = None
    
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


class BatchLocationCreate(BaseModel):
    parent_location_id: Optional[int] = None
    location_type: LocationType = LocationType.BIN
    
    prefix: str = Field(..., description="Prefijo del código, ej: 'C-'")
    start_number: int = Field(..., description="Número inicial, ej: 1")
    count: int = Field(..., ge=1, le=100, description="Cantidad de ubicaciones a crear (1-100)")
    name_template: str = Field(..., description="Template para nombre, ej: 'Contenedor {n}'")
    
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    position_prefix: Optional[str] = None
    
    capacity: int = 0
    barcode_prefix: Optional[str] = None


class BatchLocationResponse(BaseModel):
    created: int
    locations: List[StorageLocationResponse]
    errors: List[str] = []


class LocationHierarchyResponse(BaseModel):
    aisles: List[str] = []
    racks: List[str] = []
    shelves: List[str] = []
    positions: List[str] = []


class ContainerCheckResponse(BaseModel):
    available: bool
    current_product: Optional[str] = None
    current_product_id: Optional[int] = None
    current_quantity: int = 0
    remaining_capacity: Optional[int] = None
    location_id: Optional[int] = None
    location_code: Optional[str] = None


StorageLocationResponse.model_rebuild()
