from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.warehouse_layout import WarehouseLayout, LayoutCell, CellType, OccupancyLevel
from app.models.product_location_models import ProductLocationAssignment
from app.schemas.warehouse_layout import (
    WarehouseLayoutCreate, WarehouseLayoutUpdate,
    LayoutCellCreate, LayoutCellUpdate, GenerateLayoutRequest
)
import time


def get_layout(db: Session, layout_id: int) -> Optional[WarehouseLayout]:
    return db.query(WarehouseLayout).filter(WarehouseLayout.id == layout_id).first()


def get_layout_by_warehouse(db: Session, warehouse_id: int) -> Optional[WarehouseLayout]:
    return db.query(WarehouseLayout).filter(WarehouseLayout.warehouse_id == warehouse_id).first()


def get_layouts(db: Session, skip: int = 0, limit: int = 100) -> List[WarehouseLayout]:
    return db.query(WarehouseLayout).offset(skip).limit(limit).all()


def get_layouts_count(db: Session) -> int:
    return db.query(func.count(WarehouseLayout.id)).scalar()


def create_layout(db: Session, layout: WarehouseLayoutCreate, user_id: int) -> WarehouseLayout:
    existing = get_layout_by_warehouse(db, layout.warehouse_id)
    if existing:
        raise ValueError(f"Layout already exists for warehouse {layout.warehouse_id}")
    
    db_layout = WarehouseLayout(
        **layout.model_dump(),
        created_by=user_id,
        created_at=int(time.time())
    )
    db.add(db_layout)
    db.commit()
    db.refresh(db_layout)
    return db_layout


def update_layout(db: Session, layout_id: int, layout_in: WarehouseLayoutUpdate, user_id: int) -> Optional[WarehouseLayout]:
    db_layout = get_layout(db, layout_id)
    if not db_layout:
        return None
    
    update_data = layout_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_layout, field, value)
    
    db_layout.updated_by = user_id
    db_layout.updated_at = int(time.time())
    
    db.add(db_layout)
    db.commit()
    db.refresh(db_layout)
    return db_layout


def delete_layout(db: Session, layout_id: int) -> bool:
    db_layout = get_layout(db, layout_id)
    if not db_layout:
        return False
    
    db.delete(db_layout)
    db.commit()
    return True


def get_cell(db: Session, cell_id: int) -> Optional[LayoutCell]:
    return db.query(LayoutCell).filter(LayoutCell.id == cell_id).first()


def get_cells_by_layout(db: Session, layout_id: int) -> List[LayoutCell]:
    return db.query(LayoutCell).filter(LayoutCell.layout_id == layout_id).order_by(LayoutCell.row, LayoutCell.col).all()


def get_cell_by_position(db: Session, layout_id: int, row: int, col: int) -> Optional[LayoutCell]:
    return db.query(LayoutCell).filter(
        LayoutCell.layout_id == layout_id,
        LayoutCell.row == row,
        LayoutCell.col == col
    ).first()


def create_cell(db: Session, layout_id: int, cell: LayoutCellCreate) -> LayoutCell:
    existing = get_cell_by_position(db, layout_id, cell.row, cell.col)
    if existing:
        raise ValueError(f"Cell at position ({cell.row}, {cell.col}) already exists")
    
    now = int(time.time())
    db_cell = LayoutCell(
        **cell.model_dump(),
        layout_id=layout_id,
        created_at=now,
        updated_at=now
    )
    db.add(db_cell)
    db.commit()
    db.refresh(db_cell)
    return db_cell


def create_cells_batch(db: Session, layout_id: int, cells: List[LayoutCellCreate]) -> List[LayoutCell]:
    now = int(time.time())
    db_cells = []
    
    for cell in cells:
        existing = get_cell_by_position(db, layout_id, cell.row, cell.col)
        if existing:
            continue
        
        db_cell = LayoutCell(
            **cell.model_dump(),
            layout_id=layout_id,
            created_at=now,
            updated_at=now
        )
        db_cells.append(db_cell)
    
    if db_cells:
        db.add_all(db_cells)
        db.commit()
        for cell in db_cells:
            db.refresh(cell)
    
    return db_cells


def update_cell(db: Session, cell_id: int, cell_in: LayoutCellUpdate) -> Optional[LayoutCell]:
    db_cell = get_cell(db, cell_id)
    if not db_cell:
        return None
    
    update_data = cell_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_cell, field, value)
    
    db_cell.updated_at = int(time.time())
    
    db.add(db_cell)
    db.commit()
    db.refresh(db_cell)
    return db_cell


def update_cells_batch(db: Session, layout_id: int, updates: List[LayoutCellUpdate]) -> List[LayoutCell]:
    updated_cells = []
    
    for cell_update in updates:
        if cell_update.row is not None and cell_update.col is not None:
            db_cell = get_cell_by_position(db, layout_id, cell_update.row, cell_update.col)
        else:
            continue
        
        if not db_cell:
            continue
        
        update_data = cell_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_cell, field, value)
        
        db_cell.updated_at = int(time.time())
        updated_cells.append(db_cell)
    
    if updated_cells:
        db.add_all(updated_cells)
        db.commit()
        for cell in updated_cells:
            db.refresh(cell)
    
    return updated_cells


def delete_cell(db: Session, cell_id: int) -> bool:
    db_cell = get_cell(db, cell_id)
    if not db_cell:
        return False
    
    db.delete(db_cell)
    db.commit()
    return True


def delete_cells_by_layout(db: Session, layout_id: int) -> int:
    count = db.query(LayoutCell).filter(LayoutCell.layout_id == layout_id).delete()
    db.commit()
    return count


def generate_empty_layout(db: Session, layout_id: int, rows: int, cols: int, cell_width: float, cell_height: float) -> List[LayoutCell]:
    db_layout = get_layout(db, layout_id)
    if not db_layout:
        raise ValueError("Layout not found")
    
    delete_cells_by_layout(db, layout_id)
    
    now = int(time.time())
    cells = []
    
    for row in range(rows):
        for col in range(cols):
            cell = LayoutCell(
                layout_id=layout_id,
                row=row,
                col=col,
                x=col * cell_width,
                y=row * cell_height,
                width=cell_width,
                height=cell_height,
                cell_type=CellType.EMPTY,
                created_at=now,
                updated_at=now
            )
            cells.append(cell)
    
    db.add_all(cells)
    db.commit()
    for cell in cells:
        db.refresh(cell)
    
    db_layout.grid_rows = rows
    db_layout.grid_cols = cols
    db_layout.cell_width = cell_width
    db_layout.cell_height = cell_height
    db.add(db_layout)
    db.commit()
    
    return cells


def get_heatmap_data(db: Session, layout_id: int) -> dict:
    layout = get_layout(db, layout_id)
    if not layout:
        raise ValueError("Layout not found")
    
    cells = get_cells_by_layout(db, layout_id)
    cell_data = []
    total_occupancy = 0
    total_capacity = len(cells) * 100
    
    for cell in cells:
        product_count = 0
        
        if cell.linked_location_id:
            count = db.query(func.count(ProductLocationAssignment.id)).filter(
                ProductLocationAssignment.location_id == cell.linked_location_id,
                ProductLocationAssignment.quantity > 0
            ).scalar() or 0
            product_count = count
        
        occupancy_pct = cell.occupancy_percentage
        if cell.linked_location_id and cell.occupancy_percentage == 0:
            assignment = db.query(
                func.sum(ProductLocationAssignment.quantity)
            ).filter(
                ProductLocationAssignment.location_id == cell.linked_location_id
            ).scalar() or 0
            
            location = db.query(layout).first()
            if location:
                linked_loc = db.query(layout).first()
        
        total_occupancy += occupancy_pct
        
        cell_data.append({
            "row": cell.row,
            "col": cell.col,
            "occupancy_percentage": occupancy_pct,
            "occupancy_level": cell.occupancy_level.value if cell.occupancy_level else OccupancyLevel.EMPTY.value,
            "product_count": product_count
        })
    
    average_occupancy = total_occupancy / len(cells) if cells else 0
    
    return {
        "layout_id": layout_id,
        "warehouse_id": layout.warehouse_id,
        "cells": cell_data,
        "average_occupancy": round(average_occupancy, 2),
        "total_capacity": total_capacity,
        "total_occupancy": total_occupancy
    }


def export_layout(db: Session, layout_id: int) -> dict:
    layout = get_layout(db, layout_id)
    if not layout:
        raise ValueError("Layout not found")
    
    cells = get_cells_by_layout(db, layout_id)
    
    return {
        "name": layout.name,
        "description": layout.description,
        "grid_rows": layout.grid_rows,
        "grid_cols": layout.grid_cols,
        "cell_width": layout.cell_width,
        "cell_height": layout.cell_height,
        "cells": [
            {
                "row": c.row,
                "col": c.col,
                "x": c.x,
                "y": c.y,
                "width": c.width,
                "height": c.height,
                "cell_type": c.cell_type.value if c.cell_type else CellType.EMPTY.value,
                "name": c.name,
                "color": c.color,
                "linked_location_id": c.linked_location_id,
                "linked_aisle": c.linked_aisle,
                "linked_rack": c.linked_rack,
                "linked_shelf": c.linked_shelf,
                "metadata": c.metadata
            }
            for c in cells
        ],
        "exported_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }


def import_layout(db: Session, warehouse_id: int, data: dict, user_id: int) -> WarehouseLayout:
    existing = get_layout_by_warehouse(db, warehouse_id)
    if existing:
        delete_layout(db, existing.id)
    
    layout_create = WarehouseLayoutCreate(
        warehouse_id=warehouse_id,
        name=data.get("name", "Imported Layout"),
        description=data.get("description"),
        grid_rows=data.get("grid_rows", 10),
        grid_cols=data.get("grid_cols", 10),
        cell_width=data.get("cell_width", 100),
        cell_height=data.get("cell_height", 100)
    )
    
    layout = create_layout(db, layout_create, user_id)
    
    cells_data = data.get("cells", [])
    if cells_data:
        cell_creates = [
            LayoutCellCreate(
                row=c["row"],
                col=c["col"],
                x=c.get("x", c["col"] * layout.cell_width),
                y=c.get("y", c["row"] * layout.cell_height),
                width=c.get("width", layout.cell_width),
                height=c.get("height", layout.cell_height),
                cell_type=CellType(c.get("cell_type", "empty")),
                name=c.get("name"),
                color=c.get("color"),
                linked_location_id=c.get("linked_location_id"),
                linked_aisle=c.get("linked_aisle"),
                linked_rack=c.get("linked_rack"),
                linked_shelf=c.get("linked_shelf"),
                metadata=c.get("metadata")
            )
            for c in cells_data
        ]
        create_cells_batch(db, layout.id, cell_creates)
    
    return layout
