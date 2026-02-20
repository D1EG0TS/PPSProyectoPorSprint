from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
from app.models.tracking import ItemTracking, Penalization, PenalizationReason, PenalizationStatus
from app.models.integrated_request import (
    IntegratedRequest, RequestTrackingItemType,
    RequestTool, RequestEPP, RequestVehicle,
    RequestToolStatus, RequestEPPStatus, RequestVehicleStatus
)
from app.models.system import SystemConfig
from app.models.notification import NotificationType
from app.services.notification_service import NotificationService
from app.schemas.tracking import ItemTrackingCreate, PenalizationCreate

class TrackingService:
    @staticmethod
    def log_position(db: Session, data: ItemTrackingCreate, user_id: int) -> ItemTracking:
        tracking = ItemTracking(
            **data.dict(),
            recorded_by=user_id
        )
        db.add(tracking)
        db.commit()
        db.refresh(tracking)
        return tracking

    @staticmethod
    def create_penalization(db: Session, data: PenalizationCreate, created_by: int) -> Penalization:
        penalization = Penalization(
            **data.dict(),
            created_by=created_by
        )
        db.add(penalization)
        db.commit()
        db.refresh(penalization)
        return penalization
        
    @staticmethod
    def get_penalizations_by_user(db: Session, user_id: int) -> List[Penalization]:
        return db.query(Penalization).filter(Penalization.user_id == user_id).all()

    @staticmethod
    def check_late_return(
        db: Session, 
        request: IntegratedRequest, 
        item_type: RequestTrackingItemType, 
        item_id: int, 
        user_id: int
    ) -> Optional[Penalization]:
        """
        Checks if the item is returned late and creates a penalization if so.
        """
        if not request.expected_return_date:
            return None
        
        today = datetime.now().date()
        
        if today > request.expected_return_date:
            # It is late
            days_late = (today - request.expected_return_date).days
            
            # Get rates from SystemConfig
            rate_config = db.query(SystemConfig).filter(SystemConfig.key == "PENALTY_LATE_RETURN_DAILY_AMOUNT").first()
            points_config = db.query(SystemConfig).filter(SystemConfig.key == "PENALTY_LATE_RETURN_DAILY_POINTS").first()

            daily_rate = float(rate_config.value) if rate_config else 10.0
            daily_points = int(points_config.value) if points_config else 1
            
            penalty_amount = days_late * daily_rate
            penalty_points = days_late * daily_points
            
            penalization = Penalization(
                user_id=request.requested_by, # Charge the requester
                request_id=request.id,
                item_type=item_type,
                item_id=item_id,
                amount=penalty_amount,
                points=penalty_points,
                reason=PenalizationReason.LATE_RETURN,
                notes=f"Retraso de {days_late} días (Fecha esperada: {request.expected_return_date})",
                created_by=user_id 
            )
            db.add(penalization)
            db.commit()
            db.refresh(penalization)
            return penalization
        return None

    @staticmethod
    def run_daily_checks(db: Session):
        """
        Runs daily checks for upcoming expirations and overdue items.
        Should be called by a scheduler or cron job.
        """
        TrackingService.check_upcoming_expirations(db)
        TrackingService.check_overdue_items(db)

    @staticmethod
    def check_upcoming_expirations(db: Session):
        today = datetime.now().date()
        
        # Tools
        tools = db.query(RequestTool).filter(
            RequestTool.status.in_([RequestToolStatus.PRESTADA, RequestToolStatus.EN_DEVOLUCION]),
            RequestTool.expected_return_date != None
        ).all()
        
        for tool in tools:
            if not tool.expected_return_date: continue
            days_left = (tool.expected_return_date - today).days
            if days_left in [1, 2, 3]:
                # Check duplicate
                if not NotificationService.has_notification_today(
                    db, tool.request.requested_by, NotificationType.UPCOMING_EXPIRATION, tool.request_id, f"herramienta '{tool.tool.name}'"
                ):
                    NotificationService.create_notification(
                        db,
                        user_id=tool.request.requested_by,
                        title=f"Vencimiento Próximo: {tool.tool.name}",
                        message=f"Tu préstamo de la herramienta '{tool.tool.name}' vence en {days_left} días ({tool.expected_return_date}).",
                        type=NotificationType.UPCOMING_EXPIRATION,
                        related_request_id=tool.request_id
                    )

        # Vehicles (Using IntegratedRequest return date if item doesn't have it, but item doesn't have it)
        # Vehicles rely on Request status
        vehicles = db.query(RequestVehicle).filter(
            RequestVehicle.status.in_([RequestVehicleStatus.EN_USO, RequestVehicleStatus.EN_DEVOLUCION])
        ).all()
        
        for vehicle in vehicles:
            if not vehicle.request.expected_return_date: continue
            days_left = (vehicle.request.expected_return_date - today).days
            if days_left in [1, 2, 3]:
                if not NotificationService.has_notification_today(
                    db, vehicle.request.requested_by, NotificationType.UPCOMING_EXPIRATION, vehicle.request_id, f"vehículo {vehicle.vehicle.brand}"
                ):
                    NotificationService.create_notification(
                        db,
                        user_id=vehicle.request.requested_by,
                        title=f"Vencimiento Próximo: {vehicle.vehicle.brand} {vehicle.vehicle.model}",
                        message=f"Tu préstamo del vehículo vence en {days_left} días ({vehicle.request.expected_return_date}).",
                        type=NotificationType.UPCOMING_EXPIRATION,
                        related_request_id=vehicle.request_id
                    )

        # EPP (Only if expected_return_date is set, usually for temporary assignment)
        epps = db.query(RequestEPP).filter(
            RequestEPP.status.in_([RequestEPPStatus.ASIGNADO, RequestEPPStatus.EN_DEVOLUCION]),
            RequestEPP.expected_return_date != None
        ).all()
        
        for epp in epps:
             if not epp.expected_return_date: continue
             days_left = (epp.expected_return_date - today).days
             if days_left in [1, 2, 3]:
                if not NotificationService.has_notification_today(
                    db, epp.request.requested_by, NotificationType.UPCOMING_EXPIRATION, epp.request_id, f"EPP {epp.epp.product.name}"
                ):
                    NotificationService.create_notification(
                        db,
                        user_id=epp.request.requested_by,
                        title=f"Vencimiento Próximo: {epp.epp.product.name}",
                        message=f"Tu asignación de EPP vence en {days_left} días ({epp.expected_return_date}).",
                        type=NotificationType.UPCOMING_EXPIRATION,
                        related_request_id=epp.request_id
                    )

    @staticmethod
    def check_overdue_items(db: Session):
        today = datetime.now().date()
        
        # Tools
        tools = db.query(RequestTool).filter(
            RequestTool.status.in_([RequestToolStatus.PRESTADA]), # Only active loans, EN_DEVOLUCION is being processed
            RequestTool.expected_return_date < today
        ).all()
        
        for tool in tools:
             if not NotificationService.has_notification_today(
                db, tool.request.requested_by, NotificationType.LATE_RETURN, tool.request_id, f"herramienta '{tool.tool.name}'"
             ):
                days_late = (today - tool.expected_return_date).days
                NotificationService.create_notification(
                    db,
                    user_id=tool.request.requested_by,
                    title=f"Retraso en Devolución: {tool.tool.name}",
                    message=f"La herramienta '{tool.tool.name}' tiene {days_late} días de retraso. Por favor devuélvela lo antes posible para evitar penalizaciones mayores.",
                    type=NotificationType.LATE_RETURN,
                    related_request_id=tool.request_id
                )

        # Vehicles
        vehicles = db.query(RequestVehicle).join(IntegratedRequest).filter(
            RequestVehicle.status.in_([RequestVehicleStatus.EN_USO]),
            IntegratedRequest.expected_return_date < today
        ).all()
        
        for vehicle in vehicles:
             if not NotificationService.has_notification_today(
                db, vehicle.request.requested_by, NotificationType.LATE_RETURN, vehicle.request_id, f"vehículo {vehicle.vehicle.brand}"
             ):
                days_late = (today - vehicle.request.expected_return_date).days
                NotificationService.create_notification(
                    db,
                    user_id=vehicle.request.requested_by,
                    title=f"Retraso en Devolución: {vehicle.vehicle.brand}",
                    message=f"El vehículo tiene {days_late} días de retraso. Por favor devuélvelo lo antes posible.",
                    type=NotificationType.LATE_RETURN,
                    related_request_id=vehicle.request_id
                )
