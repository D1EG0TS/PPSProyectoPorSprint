from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.location_models import StorageLocation
from app.models.product import Product
from app.models.product_location_models import ProductLocationAssignment, AssignmentType
from app.models.location_audit_models import LocationAuditLog

async def assign_product_to_location(
    db: Session,
    product_id: int,
    location_id: int,
    quantity: int,
    user_id: int,
    batch_id: Optional[int] = None,
) -> ProductLocationAssignment:
    """
    Assign a quantity of product to a location.
    quantity can be positive (add) or negative (remove).
    """
    
    # 1. Validar ubicación existe
    location = db.query(StorageLocation).filter(StorageLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
        
    # 2. Validar producto existe
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check existing assignment
    assignment = db.query(ProductLocationAssignment).filter(
        ProductLocationAssignment.location_id == location_id,
        ProductLocationAssignment.product_id == product_id,
        ProductLocationAssignment.batch_id == batch_id
    ).first()
    
    current_qty = assignment.quantity if assignment else 0
    new_qty = current_qty + quantity
    
    # 3. Verificar stock disponible (para salidas)
    if quantity < 0:
        if new_qty < 0:
            raise HTTPException(status_code=400, detail="Insufficient stock in location")
            
    # Check capacity (if adding)
    if quantity > 0:
        # Calculate current total occupancy of the location
        # This assumes location.current_occupancy is maintained correctly, 
        # or we can recalculate it from assignments if needed.
        # Let's rely on location.current_occupancy but verify it matches assignments sum if possible,
        # or just add to it.
        if location.capacity > 0 and (location.current_occupancy + quantity) > location.capacity:
             raise HTTPException(status_code=400, detail="Location capacity exceeded")

    # 4. Crear/actualizar asignación
    if assignment:
        assignment.quantity = new_qty
        if assignment.quantity == 0:
            # Option: Delete if 0 or keep empty?
            # Usually keeping empty is fine, but cleaning up is cleaner.
            # Let's keep it if we want to track history, or delete.
            # User instructions didn't specify. Let's keep it for now or delete.
            # The previous code in endpoints deleted it. Let's delete it to keep clean.
            db.delete(assignment)
            # assignment object is now deleted, return value might be issue? 
            # We return ProductLocationAssignment.
            # If deleted, we can't return it attached to session.
            # Let's NOT delete for now to simplify return, or handle return carefully.
            # Actually, let's keep it with 0 quantity.
            pass
    else:
        if quantity < 0:
             # Should have been caught by insufficient stock check, 
             # but theoretically if starting from 0 and removing...
             raise HTTPException(status_code=400, detail="Insufficient stock in location (no assignment)")
             
        assignment = ProductLocationAssignment(
            product_id=product_id,
            location_id=location_id,
            warehouse_id=location.warehouse_id,
            quantity=new_qty,
            batch_id=batch_id,
            assigned_by=user_id,
            assignment_type=AssignmentType.MANUAL
        )
        db.add(assignment)
    
    # 5. Actualizar current_occupancy
    # Re-calculate total occupancy to be safe or just add delta
    location.current_occupancy += quantity
    # Ensure it doesn't go below 0
    if location.current_occupancy < 0:
        location.current_occupancy = 0
    
    db.add(location)
    
    # 6. Registrar auditoría
    action = "stock_in" if quantity > 0 else "stock_out"
    audit = LocationAuditLog(
        location_id=location_id,
        product_id=product_id,
        action=action,
        previous_quantity=current_qty,
        new_quantity=new_qty,
        user_id=user_id
    )
    db.add(audit)
    
    db.commit()
    db.refresh(assignment) if assignment in db else None
    
    return assignment
