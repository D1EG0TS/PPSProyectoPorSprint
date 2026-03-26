from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import warehouse_layout as crud_layout
from app.models.user import User
from app.models.warehouse import Warehouse
from app.schemas.warehouse_layout import (
    WarehouseLayoutCreate, WarehouseLayoutUpdate, WarehouseLayoutResponse, WarehouseLayoutDetailResponse,
    LayoutCellCreate, LayoutCellUpdate, LayoutCellResponse,
    GenerateLayoutRequest, ImportLayoutRequest, LayoutExportResponse,
    HeatmapResponse, HeatmapCell, BatchCellUpdate
)

router = APIRouter()


@router.get("/", response_model=List[WarehouseLayoutResponse])
def list_layouts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    List all warehouse layouts.
    """
    layouts = crud_layout.get_layouts(db, skip=skip, limit=limit)
    return layouts


@router.get("/count")
def count_layouts(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get total count of layouts.
    """
    count = crud_layout.get_layouts_count(db)
    return {"count": count}


@router.get("/warehouse/{warehouse_id}", response_model=Optional[WarehouseLayoutDetailResponse])
def get_layout_by_warehouse(
    warehouse_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get layout for a specific warehouse.
    """
    layout = crud_layout.get_layout_by_warehouse(db, warehouse_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found for this warehouse")
    return layout


@router.post("/", response_model=WarehouseLayoutResponse, status_code=201)
def create_layout(
    layout_in: WarehouseLayoutCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    """
    Create a new warehouse layout.
    Requires admin or super admin role.
    """
    warehouse = db.query(Warehouse).filter(Warehouse.id == layout_in.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    try:
        layout = crud_layout.create_layout(db, layout_in, current_user.id)
        return layout
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{layout_id}", response_model=WarehouseLayoutDetailResponse)
def get_layout(
    layout_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get layout details including all cells.
    """
    layout = crud_layout.get_layout(db, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    return layout


@router.put("/{layout_id}", response_model=WarehouseLayoutResponse)
def update_layout(
    layout_id: int,
    layout_in: WarehouseLayoutUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    """
    Update layout properties.
    Requires admin or super admin role.
    """
    layout = crud_layout.update_layout(db, layout_id, layout_in, current_user.id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    return layout


@router.delete("/{layout_id}")
def delete_layout(
    layout_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1]))
):
    """
    Delete a layout.
    Requires super admin role.
    """
    success = crud_layout.delete_layout(db, layout_id)
    if not success:
        raise HTTPException(status_code=404, detail="Layout not found")
    return {"success": True, "message": "Layout deleted successfully"}


@router.post("/{layout_id}/cells", response_model=LayoutCellResponse, status_code=201)
def create_cell(
    layout_id: int,
    cell_in: LayoutCellCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    """
    Create a new cell in the layout.
    """
    layout = crud_layout.get_layout(db, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    try:
        cell = crud_layout.create_cell(db, layout_id, cell_in)
        return cell
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{layout_id}/cells/batch", response_model=List[LayoutCellResponse])
def create_cells_batch(
    layout_id: int,
    cells: List[LayoutCellCreate],
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    """
    Create multiple cells at once.
    """
    layout = crud_layout.get_layout(db, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    created = crud_layout.create_cells_batch(db, layout_id, cells)
    return created


@router.get("/{layout_id}/cells", response_model=List[LayoutCellResponse])
def list_cells(
    layout_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get all cells for a layout.
    """
    layout = crud_layout.get_layout(db, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    cells = crud_layout.get_cells_by_layout(db, layout_id)
    return cells


@router.get("/{layout_id}/cells/{cell_id}", response_model=LayoutCellResponse)
def get_cell(
    layout_id: int,
    cell_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get a specific cell.
    """
    cell = crud_layout.get_cell(db, cell_id)
    if not cell or cell.layout_id != layout_id:
        raise HTTPException(status_code=404, detail="Cell not found")
    return cell


@router.put("/{layout_id}/cells/{cell_id}", response_model=LayoutCellResponse)
def update_cell(
    layout_id: int,
    cell_id: int,
    cell_in: LayoutCellUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    """
    Update a cell.
    """
    cell = crud_layout.get_cell(db, cell_id)
    if not cell or cell.layout_id != layout_id:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    updated = crud_layout.update_cell(db, cell_id, cell_in)
    return updated


@router.put("/{layout_id}/cells/batch", response_model=List[LayoutCellResponse])
def update_cells_batch(
    layout_id: int,
    update_data: BatchCellUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    """
    Update multiple cells at once.
    """
    layout = crud_layout.get_layout(db, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    updated = crud_layout.update_cells_batch(db, layout_id, update_data.cells)
    return updated


@router.delete("/{layout_id}/cells/{cell_id}")
def delete_cell(
    layout_id: int,
    cell_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    """
    Delete a cell.
    """
    cell = crud_layout.get_cell(db, cell_id)
    if not cell or cell.layout_id != layout_id:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    crud_layout.delete_cell(db, cell_id)
    return {"success": True, "message": "Cell deleted successfully"}


@router.post("/{layout_id}/generate", response_model=List[LayoutCellResponse])
def generate_layout(
    layout_id: int,
    request: GenerateLayoutRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    """
    Generate empty grid layout.
    """
    layout = crud_layout.get_layout(db, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    cells = crud_layout.generate_empty_layout(
        db, layout_id,
        rows=request.rows,
        cols=request.cols,
        cell_width=request.cell_width,
        cell_height=request.cell_height
    )
    return cells


@router.get("/{layout_id}/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    layout_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get occupancy heatmap data for the layout.
    """
    layout = crud_layout.get_layout(db, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    try:
        heatmap = crud_layout.get_heatmap_data(db, layout_id)
        return heatmap
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{layout_id}/export", response_model=LayoutExportResponse)
def export_layout(
    layout_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Export layout to JSON for backup/migration.
    """
    layout = crud_layout.get_layout(db, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    try:
        exported = crud_layout.export_layout(db, layout_id)
        return exported
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import", response_model=WarehouseLayoutResponse)
def import_layout(
    warehouse_id: int,
    import_data: ImportLayoutRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    """
    Import layout from JSON.
    """
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    try:
        data_dict = import_data.model_dump()
        layout = crud_layout.import_layout(db, warehouse_id, data_dict, current_user.id)
        return layout
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
