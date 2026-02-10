from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.location_models import StorageLocation, LocationType
from app.models.product_location_models import ProductLocationAssignment
from app.schemas.product_location import ProductLocationAssignmentResponse

async def get_product_exact_locations(
    db: Session,
    product_id: int,
    warehouse_id: Optional[int] = None
) -> List[ProductLocationAssignment]:
    """
    Retorna todas las ubicaciones donde está el producto.
    """
    query = db.query(ProductLocationAssignment).filter(
        ProductLocationAssignment.product_id == product_id,
        ProductLocationAssignment.quantity > 0
    )
    
    if warehouse_id:
        query = query.filter(ProductLocationAssignment.warehouse_id == warehouse_id)
        
    return query.all()

async def find_best_location_for_product(
    db: Session,
    product_id: int,
    warehouse_id: int,
    quantity: int
) -> Optional[StorageLocation]:
    """
    Encuentra la mejor ubicación para almacenar un producto.
    Algoritmo:
    1) Ubicaciones donde ya existe el producto (para consolidar)
    2) Ubicaciones vacías (preferiblemente de tipo SHELF o RACK)
    """
    
    # 1. Buscar ubicaciones con el mismo producto (Consolidación)
    existing_assignments = db.query(ProductLocationAssignment).join(StorageLocation).filter(
        ProductLocationAssignment.product_id == product_id,
        ProductLocationAssignment.warehouse_id == warehouse_id,
        StorageLocation.is_restricted == False
    ).all()
    
    for assignment in existing_assignments:
        loc = assignment.location
        # Check capacity
        if loc.capacity == 0 or (loc.current_occupancy + quantity <= loc.capacity):
            return loc
            
    # 2. Buscar ubicaciones vacías
    # Prioritize by type if needed, here we just look for empty ones
    empty_location = db.query(StorageLocation).filter(
        StorageLocation.warehouse_id == warehouse_id,
        StorageLocation.current_occupancy == 0,
        StorageLocation.is_restricted == False,
        # Optional: Filter by specific types suitable for products
        # StorageLocation.location_type.in_([LocationType.SHELF, LocationType.RACK]) 
    ).order_by(StorageLocation.code).first() # Order by code to fill sequentially
    
    if empty_location:
        # Check capacity just in case (though occupancy is 0)
        if empty_location.capacity == 0 or quantity <= empty_location.capacity:
            return empty_location
            
    # 3. If no empty location found or capacity issues, try locations with space but different products?
    # Usually we don't mix products in same bin unless allowed.
    # Assuming mixed storage is allowed if capacity permits:
    available_location = db.query(StorageLocation).filter(
        StorageLocation.warehouse_id == warehouse_id,
        StorageLocation.is_restricted == False,
        (StorageLocation.capacity - StorageLocation.current_occupancy) >= quantity
    ).first()
    
    return available_location
