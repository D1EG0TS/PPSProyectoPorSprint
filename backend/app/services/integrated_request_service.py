from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException

from app.models.integrated_request import (
    IntegratedRequest, IntegratedRequestStatus, RequestItem, RequestTool, 
    RequestEPP, RequestVehicle, RequestTracking, RequestTrackingItemType, 
    RequestTrackingAction, RequestItemStatus, RequestToolStatus, 
    RequestEPPStatus, RequestVehicleStatus
)
from app.models.movement import MovementRequest, MovementStatus, MovementType, MovementRequestItem
from app.models.product import Product
from app.models.tool import Tool, ToolStatus
from app.models.epp import EPP, EPPStatus
from app.models.vehicle import Vehicle, VehicleStatus
from app.schemas.integrated_request import (
    IntegratedRequestCreate, IntegratedRequestUpdate, 
    RequestItemCreate, RequestToolCreate, RequestEPPCreate, RequestVehicleCreate
)
from app.services.stock_service import StockService
from app.services.tracking_service import TrackingService
from app.services.purchase_service import PurchaseService
from app.models.purchase import PurchaseAlertReason

class IntegratedRequestService:
    @staticmethod
    def generate_request_number(db: Session) -> str:
        year = datetime.now().year
        # Find last request number for this year
        prefix = f"SOL-{year}-"
        last_req = db.query(IntegratedRequest).filter(
            IntegratedRequest.request_number.like(f"{prefix}%")
        ).order_by(desc(IntegratedRequest.id)).first()
        
        if last_req:
            try:
                last_seq = int(last_req.request_number.split('-')[-1])
                new_seq = last_seq + 1
            except ValueError:
                new_seq = 1
        else:
            new_seq = 1
            
        return f"{prefix}{new_seq:03d}"

    @staticmethod
    def create_request(db: Session, request_in: IntegratedRequestCreate, user_id: int) -> IntegratedRequest:
        req_number = IntegratedRequestService.generate_request_number(db)
        
        db_request = IntegratedRequest(
            request_number=req_number,
            requested_by=user_id,
            purpose=request_in.purpose,
            project_code=request_in.project_code,
            expected_return_date=request_in.expected_return_date,
            notes=request_in.notes,
            emergency_level=request_in.emergency_level,
            status=IntegratedRequestStatus.BORRADOR
        )
        db.add(db_request)
        db.flush() # Get ID

        # Add initial items
        if request_in.items:
            for item in request_in.items:
                IntegratedRequestService.add_product_item(db, db_request.id, item)
        
        if request_in.tools:
            for tool in request_in.tools:
                IntegratedRequestService.add_tool_item(db, db_request.id, tool)

        if request_in.epp_items:
            for epp in request_in.epp_items:
                IntegratedRequestService.add_epp_item(db, db_request.id, epp)

        if request_in.vehicles:
            for vehicle in request_in.vehicles:
                IntegratedRequestService.add_vehicle_item(db, db_request.id, vehicle)

        # Track creation
        IntegratedRequestService.log_tracking(
            db, db_request.id, RequestTrackingItemType.PRODUCTO, 0, # Generic/Global tracking
            RequestTrackingAction.SOLICITADO, user_id, "Solicitud creada (Borrador)"
        )
        
        db.commit()
        db.refresh(db_request)
        return db_request

    @staticmethod
    def get_request(db: Session, request_id: int) -> Optional[IntegratedRequest]:
        return db.query(IntegratedRequest).filter(IntegratedRequest.id == request_id).first()

    @staticmethod
    def get_requests(db: Session, skip: int = 0, limit: int = 100, user_id: Optional[int] = None) -> List[IntegratedRequest]:
        query = db.query(IntegratedRequest)
        if user_id:
            query = query.filter(IntegratedRequest.requested_by == user_id)
        return query.order_by(desc(IntegratedRequest.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def update_request(db: Session, request_id: int, request_in: IntegratedRequestUpdate) -> IntegratedRequest:
        db_request = IntegratedRequestService.get_request(db, request_id)
        if not db_request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if db_request.status != IntegratedRequestStatus.BORRADOR:
             raise HTTPException(status_code=400, detail="Only drafts can be updated")

        update_data = request_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_request, field, value)
            
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        return db_request

    @staticmethod
    def submit_request(db: Session, request_id: int, user_id: int) -> IntegratedRequest:
        db_request = IntegratedRequestService.get_request(db, request_id)
        if not db_request:
            raise HTTPException(status_code=404, detail="Request not found")
            
        if db_request.status != IntegratedRequestStatus.BORRADOR:
            raise HTTPException(status_code=400, detail="Request is not a draft")
            
        db_request.status = IntegratedRequestStatus.PENDIENTE
        
        IntegratedRequestService.log_tracking(
            db, request_id, RequestTrackingItemType.PRODUCTO, 0, 
            RequestTrackingAction.SOLICITADO, user_id, "Enviada para aprobación"
        )
        
        db.commit()
        db.refresh(db_request)
        return db_request

    @staticmethod
    def approve_request(db: Session, request_id: int, user_id: int) -> IntegratedRequest:
        db_request = IntegratedRequestService.get_request(db, request_id)
        if not db_request:
            raise HTTPException(status_code=404, detail="Request not found")
            
        if db_request.status != IntegratedRequestStatus.PENDIENTE:
            raise HTTPException(status_code=400, detail="Request is not pending")

        # Validation Logic
        # 1. Check Products Stock
        for item in db_request.items:
            current_stock = StockService.calculate_current_stock(db, item.product_id)
            if current_stock < item.quantity_requested:
                # Approve only available amount? Or reject?
                # Per requirements: "Solo aprobar cantidad disponible en stock"
                item.quantity_approved = current_stock
            else:
                item.quantity_approved = item.quantity_requested
            
            item.status = RequestItemStatus.APROBADO
            db.add(item)

        # 2. Check Tools Availability
        for req_tool in db_request.tools:
            tool = db.query(Tool).get(req_tool.tool_id)
            if tool.status != ToolStatus.AVAILABLE:
                # Can't approve this tool
                # Option: Reject item or whole request? 
                # We'll mark item as REJECTED (logic not in enum yet, so maybe set status to PENDIENTE or create logic?)
                # Requirement: "Verificar que estén disponibles"
                # If not available, we assume we cannot approve assignment.
                # For now, let's assume valid tools are selected or we fail.
                # Or we simply don't change status to APPROVED/PRESTADA yet.
                pass 
            else:
                # Reserve?
                pass
                
        # 3. Check EPP
        for req_epp in db_request.epp_items:
            epp = db.query(EPP).get(req_epp.epp_id)
            if epp.status != EPPStatus.AVAILABLE:
                pass # Similar logic

        # 4. Check Vehicles
        for req_vehicle in db_request.vehicles:
            vehicle = db.query(Vehicle).get(req_vehicle.vehicle_id)
            if vehicle.status != VehicleStatus.AVAILABLE:
                pass

        db_request.status = IntegratedRequestStatus.APROBADA
        db_request.approved_by = user_id
        db_request.approved_at = datetime.now()
        
        IntegratedRequestService.log_tracking(
            db, request_id, RequestTrackingItemType.PRODUCTO, 0, 
            RequestTrackingAction.APROBADO, user_id, "Solicitud Aprobada"
        )

        db.commit()
        db.refresh(db_request)
        return db_request

    @staticmethod
    def reject_request(db: Session, request_id: int, user_id: int, reason: str) -> IntegratedRequest:
        db_request = IntegratedRequestService.get_request(db, request_id)
        if not db_request:
             raise HTTPException(status_code=404, detail="Request not found")
        
        db_request.status = IntegratedRequestStatus.RECHAZADA
        db_request.notes = (db_request.notes or "") + f"\nRechazo: {reason}"
        
        db.commit()
        db.refresh(db_request)
        return db_request

    # --- Item Status Updates ---

    @staticmethod
    async def update_product_item_status(
        db: Session, request_id: int, item_id: int, status: RequestItemStatus, 
        user_id: int, data: dict
    ) -> RequestItem:
        item = db.query(RequestItem).filter(
            RequestItem.id == item_id, RequestItem.request_id == request_id
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        # Status Transitions
        if status == RequestItemStatus.ENTREGADO and item.status != RequestItemStatus.ENTREGADO:
            # Handle Delivery -> Stock Out
            warehouse_id = data.get("warehouse_id")
            quantity = data.get("quantity_delivered", item.quantity_approved or item.quantity_requested)
            
            if not warehouse_id:
                raise HTTPException(status_code=400, detail="Warehouse ID required for delivery")
                
            # Create internal Movement Request
            move_req = MovementRequest(
                type=MovementType.OUT,
                status=MovementStatus.APPROVED,
                source_warehouse_id=warehouse_id,
                requested_by=user_id,
                reference=f"SOL-INT-{request_id}",
                reason=f"Entrega Solicitud Integrada #{request_id}"
            )
            db.add(move_req)
            db.flush()
            
            move_item = MovementRequestItem(
                request_id=move_req.id,
                product_id=item.product_id,
                batch_id=item.batch_id,
                quantity=quantity,
                source_location_id=data.get("location_id")
            )
            db.add(move_item)
            db.commit() # Commit to make it available for apply_movement? 
            # StockService.apply_movement expects commited data or at least queryable.
            
            # Apply Movement
            await StockService.apply_movement(db, move_req.id, user_id)
            
            item.quantity_delivered = quantity
            item.status = RequestItemStatus.ENTREGADO
            
            IntegratedRequestService.log_tracking(
                db, request_id, RequestTrackingItemType.PRODUCTO, item.product_id,
                RequestTrackingAction.ENTREGADO, user_id, f"Entregado {quantity} unidades"
            )

        elif status == RequestItemStatus.EN_DEVOLUCION:
            item.status = status
            item.quantity_returned = data.get("quantity_returned", 0)
            IntegratedRequestService.log_tracking(
                db, request_id, RequestTrackingItemType.PRODUCTO, item.product_id,
                RequestTrackingAction.DEVUELTO, user_id, f"Iniciado proceso de devolución ({item.quantity_returned} un)"
            )

        elif status == RequestItemStatus.DEVUELTO_PARCIAL:
            item.status = status
            quantity_returned = data.get("quantity_returned", 0)
            item.quantity_returned = quantity_returned
            
            warehouse_id = data.get("warehouse_id")
            
            if quantity_returned > 0 and warehouse_id:
                # Create Stock IN Movement
                move_req = MovementRequest(
                    type=MovementType.IN,
                    status=MovementStatus.COMPLETED,
                    description=f"Retorno de Solicitud Integrada #{request_id}",
                    created_by=user_id,
                    approved_by=user_id,
                    warehouse_id=warehouse_id,
                    reference_type="INTEGRATED_REQUEST",
                    reference_id=request_id
                )
                db.add(move_req)
                db.flush()
                
                move_item = MovementRequestItem(
                    request_id=move_req.id,
                    product_id=item.product_id,
                    quantity=quantity_returned,
                    destination_location_id=data.get("location_id")
                )
                db.add(move_item)
                db.commit()
                
                # Apply Movement
                await StockService.apply_movement(db, move_req.id, user_id)
                
                IntegratedRequestService.log_tracking(
                    db, request_id, RequestTrackingItemType.PRODUCTO, item.product_id,
                    RequestTrackingAction.DEVUELTO, user_id, f"Devuelto {quantity_returned} unidades a stock"
                )
            else:
                 IntegratedRequestService.log_tracking(
                    db, request_id, RequestTrackingItemType.PRODUCTO, item.product_id,
                    RequestTrackingAction.DEVUELTO, user_id, f"Marcado como devuelto parcial ({quantity_returned} un)"
                )

        elif status == RequestItemStatus.CONSUMIDO:
            item.status = status
            item.quantity_returned = 0
            IntegratedRequestService.log_tracking(
                db, request_id, RequestTrackingItemType.PRODUCTO, item.product_id,
                RequestTrackingAction.DEVUELTO, user_id, "Totalmente consumido"
            )
            # Create Purchase Alert for Consumed Item
            PurchaseService.create_alert(
                db, 
                reason=PurchaseAlertReason.CONSUMED, 
                product_id=item.product_id, 
                quantity=item.quantity_delivered, 
                notes=f"Consumido en Solicitud #{request_id}"
            )
            
        else:
            item.status = status

        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update_tool_item_status(
        db: Session, request_id: int, item_id: int, status: RequestToolStatus, 
        user_id: int, data: dict
    ) -> RequestTool:
        item = db.query(RequestTool).filter(
            RequestTool.id == item_id, RequestTool.request_id == request_id
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="Tool item not found")

        tool = db.query(Tool).get(item.tool_id)
        
        if status == RequestToolStatus.PRESTADA:
            if tool.status != ToolStatus.AVAILABLE:
                raise HTTPException(status_code=400, detail="Tool is not available")
            
            tool.status = ToolStatus.IN_USE
            item.status = RequestToolStatus.PRESTADA
            item.assigned_to = data.get("assigned_to", item.assigned_to)
            item.checkout_date = datetime.now()
            
        elif status == RequestToolStatus.EN_DEVOLUCION:
            item.status = RequestToolStatus.EN_DEVOLUCION
            item.condition_in = data.get("condition_in")
            
        elif status == RequestToolStatus.DEVUELTA:
            tool.status = ToolStatus.AVAILABLE
            item.checkin_date = datetime.now()
            
            # Check for late return penalty
            request = db.query(IntegratedRequest).get(request_id)
            TrackingService.check_late_return(
                db, request, RequestTrackingItemType.HERRAMIENTA, item.tool_id, user_id
            )
            item.status = RequestToolStatus.DEVUELTA
            item.condition_in = data.get("condition_in")
            
        elif status == RequestToolStatus.DANADA:
            item.status = status
            item.damage_notes = data.get("damage_notes")
            tool.status = ToolStatus.MAINTENANCE
            
            # Create Purchase/Maintenance Alert
            PurchaseService.create_alert(
                db, 
                reason=PurchaseAlertReason.DAMAGED, 
                tool_id=item.tool_id, 
                notes=f"Herramienta dañada en Solicitud #{request_id}: {item.damage_notes}"
            )
            
        elif status == RequestToolStatus.PERDIDA:
            item.status = status
            tool.status = ToolStatus.LOST
            
            # Create Purchase Alert
            PurchaseService.create_alert(
                db, 
                reason=PurchaseAlertReason.LOST, 
                tool_id=item.tool_id, 
                notes=f"Herramienta perdida en Solicitud #{request_id}"
            )
            
        db.add(tool)
        db.add(item)
        
        IntegratedRequestService.log_tracking(
            db, request_id, RequestTrackingItemType.HERRAMIENTA, item.tool_id,
            RequestTrackingAction.ASIGNADO if status == RequestToolStatus.PRESTADA else RequestTrackingAction.DEVUELTO,
            user_id, f"Estado actualizado a {status}"
        )
        
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update_epp_item_status(
        db: Session, request_id: int, item_id: int, status: RequestEPPStatus, 
        user_id: int, data: dict
    ) -> RequestEPP:
        item = db.query(RequestEPP).filter(
            RequestEPP.id == item_id, RequestEPP.request_id == request_id
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="EPP item not found")

        epp = db.query(EPP).get(item.epp_id)
        
        if status == RequestEPPStatus.ASIGNADO:
            if epp.status != EPPStatus.AVAILABLE:
                 raise HTTPException(status_code=400, detail="EPP not available")
            
            epp.status = EPPStatus.ASSIGNED
            item.status = RequestEPPStatus.ASIGNADO
            item.assigned_to = data.get("assigned_to", item.assigned_to)
            item.checkout_date = datetime.now()

        elif status == RequestEPPStatus.EN_DEVOLUCION:
            item.status = RequestEPPStatus.EN_DEVOLUCION
            item.condition_in = data.get("condition_in")

        elif status == RequestEPPStatus.DEVUELTO:
            # Check for late return penalty
            request = db.query(IntegratedRequest).get(request_id)
            TrackingService.check_late_return(
                db, request, RequestTrackingItemType.EPP, item.epp_id, user_id
            )

            if data.get("is_disposed"):
                epp.status = EPPStatus.DISPOSED
                
                # Create Purchase Alert for Disposed EPP
                PurchaseService.create_alert(
                    db, 
                    reason=PurchaseAlertReason.DISPOSED, 
                    epp_id=item.epp_id, 
                    notes=f"EPP desechado tras Solicitud #{request_id}"
                )
            else:
                epp.status = EPPStatus.AVAILABLE
                
            item.status = RequestEPPStatus.DEVUELTO
            item.checkin_date = datetime.now()
            item.condition_in = data.get("condition_in")
            
            # Check for late return (EPP usually doesn't have late return if disposed, but if returned to stock yes)
            if not data.get("is_disposed"):
                request = db.query(IntegratedRequest).get(request_id)
                TrackingService.check_late_return(
                    db, request, RequestTrackingItemType.EPP, item.epp_id, user_id
                )

        elif status == RequestEPPStatus.DANADO:
            item.status = status
            epp.status = EPPStatus.DISPOSED # Assuming damaged EPP is disposed
            
            PurchaseService.create_alert(
                db, 
                reason=PurchaseAlertReason.DAMAGED, 
                epp_id=item.epp_id, 
                notes=f"EPP dañado en Solicitud #{request_id}"
            )
            
        db.add(epp)
        db.add(item)
        
        IntegratedRequestService.log_tracking(
            db, request_id, RequestTrackingItemType.EPP, item.epp_id,
            RequestTrackingAction.ASIGNADO if status == RequestEPPStatus.ASIGNADO else RequestTrackingAction.DEVUELTO,
            user_id, f"Estado actualizado a {status}"
        )
        
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update_vehicle_item_status(
        db: Session, request_id: int, item_id: int, status: RequestVehicleStatus, 
        user_id: int, data: dict
    ) -> RequestVehicle:
        item = db.query(RequestVehicle).filter(
            RequestVehicle.id == item_id, RequestVehicle.request_id == request_id
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="Vehicle item not found")

        vehicle = db.query(Vehicle).get(item.vehicle_id)
        
        if status == RequestVehicleStatus.EN_USO:
            if vehicle.status != VehicleStatus.AVAILABLE:
                 raise HTTPException(status_code=400, detail="Vehicle not available")
            
            vehicle.status = VehicleStatus.IN_USE
            item.status = RequestVehicleStatus.EN_USO
            item.assigned_to = data.get("assigned_to", item.assigned_to)
            item.checkout_date = datetime.now()
            
        elif status == RequestVehicleStatus.EN_DEVOLUCION:
            item.status = RequestVehicleStatus.EN_DEVOLUCION
            if "odometer_in" in data:
                item.odometer_in = data["odometer_in"]
            if "fuel_level_in" in data:
                item.fuel_level_in = data["fuel_level_in"]
            if "return_notes" in data:
                item.return_notes = data["return_notes"]

        elif status == RequestVehicleStatus.DEVUELTO:
            vehicle.status = VehicleStatus.AVAILABLE
            
            # Check for late return penalty
            request = db.query(IntegratedRequest).get(request_id)
            TrackingService.check_late_return(
                db, request, RequestTrackingItemType.VEHICULO, item.vehicle_id, user_id
            )

            item.status = RequestVehicleStatus.DEVUELTO
            item.checkin_date = datetime.now()
            
            if "odometer_in" in data:
                item.odometer_in = data["odometer_in"]
                vehicle.current_odometer = data["odometer_in"] # Update vehicle master record
            if "fuel_level_in" in data:
                item.fuel_level_in = data["fuel_level_in"]
            if "return_notes" in data:
                item.return_notes = data["return_notes"]
            
        db.add(vehicle)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    # --- Item Management ---

    @staticmethod
    def add_product_item(db: Session, request_id: int, item_in: RequestItemCreate) -> RequestItem:
        db_item = RequestItem(
            request_id=request_id,
            product_id=item_in.product_id,
            batch_id=item_in.batch_id,
            quantity_requested=item_in.quantity_requested,
            purpose=item_in.purpose,
            notes=item_in.notes
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    @staticmethod
    def add_tool_item(db: Session, request_id: int, item_in: RequestToolCreate) -> RequestTool:
        # Verify tool availability
        tool = db.query(Tool).get(item_in.tool_id)
        if not tool or tool.status != ToolStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail=f"Tool {item_in.tool_id} not available")

        db_item = RequestTool(
            request_id=request_id,
            tool_id=item_in.tool_id,
            assigned_to=item_in.assigned_to,
            expected_return_date=item_in.expected_return_date
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    @staticmethod
    def add_epp_item(db: Session, request_id: int, item_in: RequestEPPCreate) -> RequestEPP:
        epp = db.query(EPP).get(item_in.epp_id)
        if not epp or epp.status != EPPStatus.AVAILABLE:
             raise HTTPException(status_code=400, detail=f"EPP {item_in.epp_id} not available")

        db_item = RequestEPP(
            request_id=request_id,
            epp_id=item_in.epp_id,
            assigned_to=item_in.assigned_to,
            expected_return_date=item_in.expected_return_date
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    @staticmethod
    def add_vehicle_item(db: Session, request_id: int, item_in: RequestVehicleCreate) -> RequestVehicle:
        vehicle = db.query(Vehicle).get(item_in.vehicle_id)
        if not vehicle or vehicle.status != VehicleStatus.AVAILABLE:
             raise HTTPException(status_code=400, detail=f"Vehicle {item_in.vehicle_id} not available")

        db_item = RequestVehicle(
            request_id=request_id,
            vehicle_id=item_in.vehicle_id,
            assigned_to=item_in.assigned_to
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    # --- Helpers ---
    @staticmethod
    def log_tracking(db: Session, request_id: int, item_type: RequestTrackingItemType, 
                     item_id: int, action: RequestTrackingAction, user_id: int, notes: str = None):
        tracking = RequestTracking(
            request_id=request_id,
            item_type=item_type,
            item_id=item_id,
            action=action,
            performed_by=user_id,
            notes=notes
        )
        db.add(tracking)
