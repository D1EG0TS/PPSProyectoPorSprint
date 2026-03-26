from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum


class CellType(str, Enum):
    ZONE = "zone"
    AISLE = "aisle"
    RACK = "rack"
    SHELF = "shelf"
    STORAGE = "storage"
    RECEIVING = "receiving"
    SHIPPING = "shipping"
    STAGING = "staging"
    EMPTY = "empty"


class OccupancyLevel(str, Enum):
    EMPTY = "empty"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    FULL = "full"


class LayoutCellBase(BaseModel):
    row: int
    col: int
    x: float
    y: float
    width: float
    height: float
    cell_type: CellType = CellType.EMPTY
    name: Optional[str] = None
    color: Optional[str] = None
    linked_location_id: Optional[int] = None
    linked_aisle: Optional[str] = None
    linked_rack: Optional[str] = None
    linked_shelf: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class LayoutCellCreate(LayoutCellBase):
    pass


class LayoutCellUpdate(BaseModel):
    row: Optional[int] = None
    col: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    cell_type: Optional[CellType] = None
    name: Optional[str] = None
    color: Optional[str] = None
    occupancy_level: Optional[OccupancyLevel] = None
    occupancy_percentage: Optional[float] = None
    linked_location_id: Optional[int] = None
    linked_aisle: Optional[str] = None
    linked_rack: Optional[str] = None
    linked_shelf: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class LayoutCellResponse(LayoutCellBase):
    id: int
    layout_id: int
    occupancy_level: OccupancyLevel
    occupancy_percentage: float
    created_at: int
    updated_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class WarehouseLayoutBase(BaseModel):
    name: str
    description: Optional[str] = None
    grid_rows: int = 10
    grid_cols: int = 10
    cell_width: float = 100
    cell_height: float = 100


class WarehouseLayoutCreate(WarehouseLayoutBase):
    warehouse_id: int


class WarehouseLayoutUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    grid_rows: Optional[int] = None
    grid_cols: Optional[int] = None
    cell_width: Optional[float] = None
    cell_height: Optional[float] = None
    is_active: Optional[bool] = None


class WarehouseLayoutResponse(WarehouseLayoutBase):
    id: int
    warehouse_id: int
    is_active: bool
    created_by: int
    updated_by: Optional[int] = None
    created_at: int
    updated_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class WarehouseLayoutDetailResponse(WarehouseLayoutResponse):
    cells: List[LayoutCellResponse]


class GenerateLayoutRequest(BaseModel):
    rows: int = 10
    cols: int = 10
    cell_width: float = 100
    cell_height: float = 100
    zone_layout: Optional[List[List[str]]] = None


class ImportLayoutRequest(BaseModel):
    name: str
    description: Optional[str] = None
    grid_rows: int
    grid_cols: int
    cell_width: float
    cell_height: float
    cells: List[Dict[str, Any]]


class HeatmapCell(BaseModel):
    row: int
    col: int
    occupancy_percentage: float
    occupancy_level: OccupancyLevel
    product_count: int = 0


class HeatmapResponse(BaseModel):
    layout_id: int
    warehouse_id: int
    cells: List[HeatmapCell]
    average_occupancy: float
    total_capacity: int
    total_occupancy: int


class LayoutExportResponse(BaseModel):
    name: str
    description: Optional[str] = None
    grid_rows: int
    grid_cols: int
    cell_width: float
    cell_height: float
    cells: List[Dict[str, Any]]
    exported_at: str


class BatchCellUpdate(BaseModel):
    cells: List[LayoutCellUpdate]
