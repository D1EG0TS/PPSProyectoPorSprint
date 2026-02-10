from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.movement import MovementRequest, Movement, MovementType, MovementStatus
from app.models.location_models import StorageLocation
from app.services import location_service, inventory_location_service

async def process_movement_with_locations(
    db: Session,
    movement_request_id: int,
    user_id: int
) -> List[Movement]:
    """
    Procesa un MovementRequest, actualizando el inventario en las ubicaciones correspondientes.
    Genera registros en la tabla Movement y actualiza ProductLocationAssignment.
    """
    request = db.query(MovementRequest).filter(MovementRequest.id == movement_request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Movement request not found")
        
    if request.status == MovementStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Movement request already completed")
        
    created_movements = []
    
    for item in request.items:
        # Determine direction and locations
        if request.type == MovementType.IN:
            # Check explicit location
            target_location_id = item.destination_location_id
            
            if not target_location_id:
                # Entrada: Buscar mejor ubicación auto
                target_location = await inventory_location_service.find_best_location_for_product(
                    db, 
                    product_id=item.product_id, 
                    warehouse_id=request.destination_warehouse_id, 
                    quantity=item.quantity
                )
                if target_location:
                    target_location_id = target_location.id
            
            if not target_location_id:
                 raise HTTPException(status_code=400, detail=f"No suitable location found for product {item.product_id}")
            
            # Asignar producto a ubicación
            await location_service.assign_product_to_location(
                db,
                product_id=item.product_id,
                location_id=target_location_id,
                quantity=item.quantity,
                user_id=user_id,
                batch_id=item.batch_id
            )
            
            # Crear registro de movimiento
            mov = Movement(
                movement_request_id=request.id,
                type=MovementType.IN,
                product_id=item.product_id,
                warehouse_id=request.destination_warehouse_id,
                quantity=item.quantity,
                previous_balance=0, # TODO: Calculate properly if needed
                new_balance=item.quantity # TODO: Calculate properly
            )
            db.add(mov)
            created_movements.append(mov)
            
        elif request.type == MovementType.OUT:
            qty_to_remove = item.quantity
            
            # Check explicit location
            if item.source_location_id:
                # Validate stock in that location
                # (assign_product_to_location handles validation of negative quantity usually, but better to check)
                
                await location_service.assign_product_to_location(
                    db,
                    product_id=item.product_id,
                    location_id=item.source_location_id,
                    quantity=-qty_to_remove,
                    user_id=user_id,
                    batch_id=item.batch_id
                )
                
                mov = Movement(
                    movement_request_id=request.id,
                    type=MovementType.OUT,
                    product_id=item.product_id,
                    warehouse_id=request.source_warehouse_id,
                    quantity=-qty_to_remove,
                    previous_balance=0, # Simplified
                    new_balance=0 
                )
                db.add(mov)
                created_movements.append(mov)
                
            else:
                # Salida: Buscar ubicaciones con stock
                # Strategy: FIFO or First Available
                # Get all locations with stock
                locations = await inventory_location_service.get_product_exact_locations(
                    db,
                    product_id=item.product_id,
                    warehouse_id=request.source_warehouse_id
                )
                
                if sum(loc.quantity for loc in locations) < qty_to_remove:
                    raise HTTPException(status_code=400, detail=f"Insufficient stock for product {item.product_id}")
                
                for assignment in locations:
                    if qty_to_remove <= 0:
                        break
                        
                    remove_from_this = min(assignment.quantity, qty_to_remove)
                    
                    # Remove from location
                    await location_service.assign_product_to_location(
                        db,
                        product_id=item.product_id,
                        location_id=assignment.location_id,
                        quantity=-remove_from_this,
                        user_id=user_id,
                        batch_id=item.batch_id
                    )
                    
                    # Create movement record
                    mov = Movement(
                        movement_request_id=request.id,
                        type=MovementType.OUT,
                        product_id=item.product_id,
                        warehouse_id=request.source_warehouse_id,
                        quantity=-remove_from_this,
                        previous_balance=assignment.quantity,
                        new_balance=assignment.quantity - remove_from_this
                    )
                    db.add(mov)
                    created_movements.append(mov)
                    
                    qty_to_remove -= remove_from_this
                
        # Handle TRANSFER and others similarly...
        
    request.status = MovementStatus.COMPLETED
    db.add(request)
    db.commit()
    
    return created_movements
