from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.movement import MovementRequest, MovementRequestItem, Movement, MovementStatus, MovementType, MovementPriority
from app.schemas.movement import MovementRequestCreate, MovementRequestUpdate, MovementRequestItemCreate


class CRUDMovementRequest:
    def _generate_request_number(self, db: Session) -> str:
        year = datetime.now().year
        count = db.query(MovementRequest).filter(
            func.strftime('%Y', MovementRequest.created_at) == str(year)
        ).count()
        return f"MR-{year}-{(count + 1):05d}"

    def create(self, db: Session, obj_in: MovementRequestCreate, user_id: int) -> MovementRequest:
        request_number = self._generate_request_number(db)
        
        db_obj = MovementRequest(
            request_number=request_number,
            type=obj_in.type,
            status=MovementStatus.DRAFT,
            requested_by=user_id,
            source_warehouse_id=obj_in.source_warehouse_id,
            destination_warehouse_id=obj_in.destination_warehouse_id,
            reason=obj_in.reason,
            reference=obj_in.reference,
            project_name=obj_in.project_name,
            project_code=obj_in.project_code,
            movement_purpose=obj_in.movement_purpose.value if obj_in.movement_purpose else None,
            operator_notes=obj_in.operator_notes,
            expected_date=obj_in.expected_date,
            priority=obj_in.priority.value if obj_in.priority else MovementPriority.NORMAL.value,
            department=obj_in.department,
            cost_center=obj_in.cost_center
        )
        db.add(db_obj)
        db.flush()

        for item_in in obj_in.items:
            item = MovementRequestItem(
                request_id=db_obj.id,
                product_id=item_in.product_id,
                batch_id=item_in.batch_id,
                quantity=item_in.quantity,
                quantity_delivered=item_in.quantity_delivered,
                notes=item_in.notes,
                source_location_id=item_in.source_location_id,
                destination_location_id=item_in.destination_location_id,
                lot_number=item_in.lot_number,
                serial_number=item_in.serial_number,
                container_code=item_in.container_code,
                priority=item_in.priority.value if item_in.priority else "NORMAL",
                manufacturing_date=item_in.manufacturing_date,
                expiry_date=item_in.expiry_date,
                storage_conditions=item_in.storage_conditions.value if item_in.storage_conditions else "AMBIENT",
                quality_status=item_in.quality_status.value if item_in.quality_status else "PENDING_QC",
                unit_cost=item_in.unit_cost,
                status=item_in.status
            )
            db.add(item)
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, id: int) -> Optional[MovementRequest]:
        return db.query(MovementRequest).filter(MovementRequest.id == id).first()

    def get_by_number(self, db: Session, request_number: str) -> Optional[MovementRequest]:
        return db.query(MovementRequest).filter(MovementRequest.request_number == request_number).first()

    def get_multi_by_user(self, db: Session, user_id: int, skip: int = 0, limit: int = 100, status: Optional[str] = None, type: Optional[str] = None, priority: Optional[str] = None) -> List[MovementRequest]:
        query = db.query(MovementRequest).filter(MovementRequest.requested_by == user_id)
        if status:
            query = query.filter(MovementRequest.status == status)
        if type:
            query = query.filter(MovementRequest.type == type)
        if priority:
            query = query.filter(MovementRequest.priority == priority)
        return query.order_by(MovementRequest.created_at.desc()).offset(skip).limit(limit).all()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None, type: Optional[str] = None, warehouse_id: Optional[int] = None, priority: Optional[str] = None) -> List[MovementRequest]:
        query = db.query(MovementRequest)
        if status:
            query = query.filter(MovementRequest.status == status)
        if type:
            query = query.filter(MovementRequest.type == type)
        if warehouse_id:
            query = query.filter(
                (MovementRequest.source_warehouse_id == warehouse_id) |
                (MovementRequest.destination_warehouse_id == warehouse_id)
            )
        if priority:
            query = query.filter(MovementRequest.priority == priority)
        return query.order_by(MovementRequest.created_at.desc()).offset(skip).limit(limit).all()

    def update(self, db: Session, *, db_obj: MovementRequest, obj_in: MovementRequestUpdate) -> MovementRequest:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if hasattr(value, 'value'):
                    setattr(db_obj, field, value.value)
                else:
                    setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def submit(self, db: Session, db_obj: MovementRequest, user_id: int) -> MovementRequest:
        if db_obj.status != MovementStatus.DRAFT:
            raise ValueError("Solo solicitudes en estado DRAFT pueden enviarse")
        
        if not db_obj.items:
            raise ValueError("La solicitud debe tener al menos un producto")
        
        if db_obj.type in [MovementType.OUT.value, MovementType.TRANSFER.value]:
            if not db_obj.source_warehouse_id:
                 raise ValueError("Almacén de origen es requerido para salidas/transferencias")
        
        previous_status = db_obj.status
        db_obj.status = MovementStatus.PENDING
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_pending(self, db: Session, skip: int = 0, limit: int = 100, type: Optional[str] = None, warehouse_id: Optional[int] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, priority: Optional[str] = None) -> List[MovementRequest]:
        query = db.query(MovementRequest).filter(MovementRequest.status == MovementStatus.PENDING)
        
        if type:
            query = query.filter(MovementRequest.type == type)
        
        if warehouse_id:
            query = query.filter(
                (MovementRequest.source_warehouse_id == warehouse_id) |
                (MovementRequest.destination_warehouse_id == warehouse_id)
            )
            
        if priority:
            query = query.filter(MovementRequest.priority == priority)

        return query.order_by(MovementRequest.priority.desc(), MovementRequest.created_at.asc()).offset(skip).limit(limit).all()

    def approve(self, db: Session, db_obj: MovementRequest, user_id: int, notes: Optional[str] = None) -> MovementRequest:
        if db_obj.status != MovementStatus.PENDING:
            raise ValueError("Solo solicitudes PENDING pueden aprobarse")
        
        db_obj.status = MovementStatus.APPROVED
        db_obj.approved_by = user_id
        if notes:
            db_obj.approval_notes = notes
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def reject(self, db: Session, db_obj: MovementRequest, user_id: int, notes: Optional[str] = None) -> MovementRequest:
        if db_obj.status != MovementStatus.PENDING:
            raise ValueError("Solo solicitudes PENDING pueden rechazarse")
        
        db_obj.status = MovementStatus.REJECTED
        if notes:
            db_obj.approval_notes = notes
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def cancel(self, db: Session, db_obj: MovementRequest, user_id: int, notes: Optional[str] = None) -> MovementRequest:
        if db_obj.status in [MovementStatus.APPLIED, MovementStatus.COMPLETED]:
            raise ValueError("No se puede cancelar solicitudes ya aplicadas o completadas")
        
        db_obj.status = MovementStatus.CANCELLED
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def apply(self, db: Session, db_obj: MovementRequest, user_id: int) -> MovementRequest:
        if db_obj.status != MovementStatus.APPROVED:
            raise ValueError("Solicitud debe estar APROBADA para aplicar")

        for item in db_obj.items:
            if db_obj.source_warehouse_id:
                current_balance_source = db.query(func.sum(Movement.quantity)).filter(
                    Movement.warehouse_id == db_obj.source_warehouse_id,
                    Movement.product_id == item.product_id
                ).scalar() or 0
                
                new_balance_source = current_balance_source - item.quantity
                
                movement_out = Movement(
                    movement_request_id=db_obj.id,
                    type=MovementType.OUT if db_obj.type == MovementType.OUT else db_obj.type,
                    product_id=item.product_id,
                    warehouse_id=db_obj.source_warehouse_id,
                    location_id=item.source_location_id,
                    quantity=-item.quantity,
                    previous_balance=current_balance_source,
                    new_balance=new_balance_source,
                    lot_number=item.lot_number,
                    serial_number=item.serial_number
                )
                db.add(movement_out)

            if db_obj.destination_warehouse_id:
                current_balance_dest = db.query(func.sum(Movement.quantity)).filter(
                    Movement.warehouse_id == db_obj.destination_warehouse_id,
                    Movement.product_id == item.product_id
                ).scalar() or 0
                
                new_balance_dest = current_balance_dest + item.quantity
                
                movement_in = Movement(
                    movement_request_id=db_obj.id,
                    type=MovementType.IN if db_obj.type == MovementType.IN else db_obj.type,
                    product_id=item.product_id,
                    warehouse_id=db_obj.destination_warehouse_id,
                    location_id=item.destination_location_id,
                    quantity=item.quantity,
                    previous_balance=current_balance_dest,
                    new_balance=new_balance_dest,
                    lot_number=item.lot_number,
                    serial_number=item.serial_number
                )
                db.add(movement_in)
                
                item.quantity_delivered = item.quantity
                item.status = "DELIVERED"
                db.add(item)

        db_obj.status = MovementStatus.COMPLETED
        db_obj.actual_date = datetime.now(timezone.utc)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_tracking_event(self, db: Session, request_id: int, event_type: str, performed_by: int, notes: Optional[str] = None, location_name: Optional[str] = None) -> dict:
        from app.models.tracking_models import MovementTrackingEvent
        event = MovementTrackingEvent(
            request_id=request_id,
            event_type=event_type,
            performed_by=performed_by,
            notes=notes,
            location_name=location_name
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def get_tracking_events(self, db: Session, request_id: int) -> List:
        from app.models.tracking_models import MovementTrackingEvent
        return db.query(MovementTrackingEvent).filter(
            MovementTrackingEvent.request_id == request_id
        ).order_by(MovementTrackingEvent.performed_at.desc()).all()


class CRUDMovement:
    def calculate_current_stock(self, db: Session, product_id: int, warehouse_id: int) -> int:
        return db.query(func.sum(Movement.quantity)).filter(
            Movement.warehouse_id == warehouse_id,
            Movement.product_id == product_id
        ).scalar() or 0

    def get_ledger(self, db: Session, product_id: int, skip: int = 0, limit: int = 100) -> List[Movement]:
        return db.query(Movement).filter(
            Movement.product_id == product_id
        ).order_by(Movement.created_at.desc(), Movement.id.desc()).offset(skip).limit(limit).all()

    def get_warehouse_stock(self, db: Session, warehouse_id: int) -> List[dict]:
        results = db.query(
            Movement.product_id,
            func.sum(Movement.quantity).label("quantity")
        ).filter(
            Movement.warehouse_id == warehouse_id
        ).group_by(Movement.product_id).having(func.sum(Movement.quantity) > 0).all()
        
        return [{"product_id": r.product_id, "quantity": r.quantity} for r in results]

    def get_by_request(self, db: Session, request_id: int) -> List[Movement]:
        return db.query(Movement).filter(
            Movement.movement_request_id == request_id
        ).order_by(Movement.created_at.desc()).all()


movement_request = CRUDMovementRequest()
movement = CRUDMovement()
