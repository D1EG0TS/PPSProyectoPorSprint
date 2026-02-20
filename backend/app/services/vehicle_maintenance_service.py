from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract, desc
from datetime import date, timedelta, datetime
from typing import List, Optional
from decimal import Decimal

from app.models.vehicle import Vehicle
from app.models.vehicle_maintenance import (
    VehicleMaintenanceRecord, 
    VehicleMaintenanceType, 
    VehicleMaintenancePart, 
    VehicleMaintenanceAttachment,
    MaintenanceStatus,
    MaintenanceCategory
)
from app.schemas.vehicle_maintenance_schemas import (
    MaintenanceRecordCreate, 
    MaintenanceRecordUpdate,
    UpcomingMaintenanceResponse,
    MaintenanceStatsResponse,
    DashboardStats
)

from app.models.movement import MovementRequest, MovementStatus, MovementType, MovementRequestItem
from app.services.stock_service import StockService

class VehicleMaintenanceService:
    
    @staticmethod
    def create_maintenance_record(db: Session, data: MaintenanceRecordCreate, user_id: int) -> VehicleMaintenanceRecord:
        # Validate Vehicle
        vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
        if not vehicle:
            raise ValueError(f"Vehicle with id {data.vehicle_id} not found")

        # Validate Type
        m_type = db.query(VehicleMaintenanceType).filter(VehicleMaintenanceType.id == data.maintenance_type_id).first()
        if not m_type:
            raise ValueError(f"Maintenance Type with id {data.maintenance_type_id} not found")

        # Validation: Odometer check (optional, but good practice)
        if data.odometer_at_service and vehicle.odometer and data.odometer_at_service < vehicle.odometer:
            # This might be a historic record, so maybe just warning, or strict block?
            # User requirement: "Kilometraje no puede ser menor que registro anterior"
            # We should check the LAST maintenance record, not just current vehicle odometer (which might be updated separately)
            last_record = db.query(VehicleMaintenanceRecord)\
                .filter(VehicleMaintenanceRecord.vehicle_id == data.vehicle_id)\
                .filter(VehicleMaintenanceRecord.odometer_at_service.isnot(None))\
                .order_by(VehicleMaintenanceRecord.odometer_at_service.desc())\
                .first()
            
            if last_record and last_record.odometer_at_service and data.odometer_at_service < last_record.odometer_at_service:
                 raise ValueError(f"Odometer ({data.odometer_at_service}) cannot be less than previous record ({last_record.odometer_at_service})")

        # Calculate Next Maintenance
        next_date, next_odo = VehicleMaintenanceService.calculate_next_maintenance(
            db, data.vehicle_id, data.maintenance_type_id, data.service_date, data.odometer_at_service
        )

        # Create Record
        db_record = VehicleMaintenanceRecord(
            vehicle_id=data.vehicle_id,
            maintenance_type_id=data.maintenance_type_id,
            odometer_at_service=data.odometer_at_service,
            service_date=data.service_date,
            next_recommended_date=next_date,
            next_recommended_odometer=next_odo,
            cost_amount=data.cost_amount,
            cost_currency=data.cost_currency,
            provider_name=data.provider_name,
            provider_contact=data.provider_contact,
            performed_by=user_id,
            status=data.status,
            priority=data.priority,
            description=data.description,
            notes=data.notes,
            requires_followup=data.requires_followup,
            followup_date=data.followup_date
        )
        
        db.add(db_record)
        db.flush() # To get ID

        # Add Parts if any
        if data.parts:
            for part in data.parts:
                db_part = VehicleMaintenancePart(
                    maintenance_id=db_record.id,
                    part_name=part.part_name,
                    product_id=part.product_id,
                    warehouse_id=part.warehouse_id,
                    part_number=part.part_number,
                    quantity=part.quantity,
                    unit=part.unit,
                    unit_cost=part.unit_cost,
                    total_cost=part.total_cost or (part.quantity * (part.unit_cost or 0)),
                    supplier=part.supplier,
                    warranty_months=part.warranty_months
                )
                db.add(db_part)
                
        db.commit()
        db.refresh(db_record)
        return db_record

    @staticmethod
    def calculate_next_maintenance(db: Session, vehicle_id: int, type_id: int, service_date: date, odometer: Optional[int]):
        m_type = db.query(VehicleMaintenanceType).filter(VehicleMaintenanceType.id == type_id).first()
        if not m_type:
            return None, None
            
        next_date = None
        next_odo = None
        
        if m_type.recommended_interval_months:
            try:
                # Basic approximation for now
                days = int(m_type.recommended_interval_months * 30.44)
                next_date = service_date + timedelta(days=days)
            except:
                pass
        
        if m_type.recommended_interval_km and odometer:
            next_odo = odometer + m_type.recommended_interval_km
            
        return next_date, next_odo

    @staticmethod
    def schedule_next_maintenance(db: Session, last_record: VehicleMaintenanceRecord) -> Optional[VehicleMaintenanceRecord]:
        """
        Creates a new SCHEDULED maintenance record based on the completion of the last record.
        """
        m_type = last_record.maintenance_type
        if not m_type:
            return None
            
        # We use the next_recommended values calculated when the record was created/updated
        next_date = last_record.next_recommended_date
        next_odo = last_record.next_recommended_odometer
        
        # If no next schedule calculated, try to calculate now
        if not next_date and not next_odo:
             next_date, next_odo = VehicleMaintenanceService.calculate_next_maintenance(
                 db, last_record.vehicle_id, last_record.maintenance_type_id, 
                 last_record.service_date, last_record.odometer_at_service
             )

        if not next_date and not next_odo:
            return None # No schedule defined for this type
            
        # Check if a future scheduled record already exists to avoid duplicates
        existing = db.query(VehicleMaintenanceRecord).filter(
            VehicleMaintenanceRecord.vehicle_id == last_record.vehicle_id,
            VehicleMaintenanceRecord.maintenance_type_id == last_record.maintenance_type_id,
            VehicleMaintenanceRecord.status == MaintenanceStatus.SCHEDULED,
            VehicleMaintenanceRecord.service_date >= last_record.service_date
        ).first()
        
        if existing:
            return existing

        # Create new scheduled record
        # For scheduled records, odometer_at_service acts as the "Target Odometer"
        new_record = VehicleMaintenanceRecord(
            vehicle_id=last_record.vehicle_id,
            maintenance_type_id=last_record.maintenance_type_id,
            service_date=next_date if next_date else (date.today() + timedelta(days=30)), # Fallback date
            odometer_at_service=next_odo, # Target Odometer
            status=MaintenanceStatus.SCHEDULED,
            priority=last_record.priority,
            description=f"Auto-scheduled following maintenance ID {last_record.id}",
            created_at=datetime.now()
        )
        
        db.add(new_record)
        db.flush()
        return new_record

    @staticmethod
    async def complete_maintenance(db: Session, record_id: int, user_id: int) -> VehicleMaintenanceRecord:
        record = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.id == record_id).first()
        if not record:
            raise ValueError("Record not found")
            
        if record.status == MaintenanceStatus.COMPLETED:
            return record # Already done
            
        record.status = MaintenanceStatus.COMPLETED
        record.performed_by = user_id
        
        # Update vehicle odometer if this record has a higher reading (implies updated reading)
        if record.odometer_at_service and record.vehicle.odometer:
             if record.odometer_at_service > record.vehicle.odometer:
                record.vehicle.odometer = record.odometer_at_service
        elif record.odometer_at_service and not record.vehicle.odometer:
             record.vehicle.odometer = record.odometer_at_service
            
        db.flush()
        
        # Schedule next maintenance automatically
        VehicleMaintenanceService.schedule_next_maintenance(db, record)
        
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def check_upcoming_maintenance(db: Session, vehicle_id: Optional[int] = None) -> List[UpcomingMaintenanceResponse]:
        upcoming = []
        today = date.today()

        # 1. Explicitly Scheduled Maintenance (status=SCHEDULED)
        q_scheduled = db.query(VehicleMaintenanceRecord).filter(
            VehicleMaintenanceRecord.status == MaintenanceStatus.SCHEDULED
        )
        if vehicle_id:
            q_scheduled = q_scheduled.filter(VehicleMaintenanceRecord.vehicle_id == vehicle_id)
        
        scheduled_records = q_scheduled.all()
        for record in scheduled_records:
            delta = (record.service_date - today).days
            
            km_remaining = None
            if record.odometer_at_service and record.vehicle.odometer:
                km_remaining = record.odometer_at_service - record.vehicle.odometer

            upcoming.append(UpcomingMaintenanceResponse(
                id=record.id,
                vehicle_id=record.vehicle_id,
                vehicle_name=f"{record.vehicle.brand} {record.vehicle.model}",
                maintenance_type_name=record.maintenance_type.name,
                due_date=record.service_date,
                due_odometer=record.odometer_at_service,
                days_remaining=delta,
                km_remaining=km_remaining,
                priority=record.maintenance_type.category.value if record.maintenance_type else "normal",
                brand=record.vehicle.brand,
                model=record.vehicle.model,
                license_plate=record.vehicle.license_plate
            ))

        # 2. Suggested Maintenance based on History
        # Find records where next_recommended_date is within 30 days OR next_recommended_odometer is close
        # This requires knowing current odometer for odometer based checks.
        
        # Strategy: Get latest maintenance for each type for the vehicle(s)
        # using a subquery to ensure compatibility with SQLite (no DISTINCT ON)
        
        subquery = db.query(
            VehicleMaintenanceRecord.vehicle_id,
            VehicleMaintenanceRecord.maintenance_type_id,
            func.max(VehicleMaintenanceRecord.service_date).label('max_date')
        ).group_by(
            VehicleMaintenanceRecord.vehicle_id,
            VehicleMaintenanceRecord.maintenance_type_id
        ).subquery()
        
        query = db.query(VehicleMaintenanceRecord).join(
            subquery,
            and_(
                VehicleMaintenanceRecord.vehicle_id == subquery.c.vehicle_id,
                VehicleMaintenanceRecord.maintenance_type_id == subquery.c.maintenance_type_id,
                VehicleMaintenanceRecord.service_date == subquery.c.max_date
            )
        )
        
        if vehicle_id:
            query = query.filter(VehicleMaintenanceRecord.vehicle_id == vehicle_id)
        
        # Exclude records that already have a SCHEDULED follow-up
        # This prevents showing "Suggested" if there is already a "Scheduled" one
        # Optimization: Fetch all scheduled types first? 
        # For now, let's just return both, user can decide. 
        # Or filter out if type matches?
        # Let's keep simple: show suggestions even if scheduled, or better, filter.
        
        latest_records = query.all()
        
        # Get set of (vehicle_id, maintenance_type_id) that are already scheduled
        scheduled_keys = set((r.vehicle_id, r.maintenance_type_id) for r in scheduled_records)
        
        for record in latest_records:
            if (record.vehicle_id, record.maintenance_type_id) in scheduled_keys:
                continue # Skip if already scheduled
                
            is_due = False
            days_remaining = None
            km_remaining = None
            
            # Check Date
            if record.next_recommended_date:
                delta = (record.next_recommended_date - today).days
                if 0 <= delta <= 30: # Due in next 30 days
                    is_due = True
                    days_remaining = delta
                elif delta < 0: # Overdue
                    is_due = True
                    days_remaining = delta
            
            # Check Odometer (Need current vehicle odometer)
            # This is N+1 query potential, but manageable for limited fleet size
            if record.next_recommended_odometer and record.vehicle.odometer:
                current_odo = record.vehicle.odometer
                remaining = record.next_recommended_odometer - current_odo
                if remaining <= 1000: # Due in 1000km or overdue
                    is_due = True
                    km_remaining = remaining
            
            if is_due:
                upcoming.append(UpcomingMaintenanceResponse(
                    vehicle_id=record.vehicle_id,
                    vehicle_name=f"{record.vehicle.brand} {record.vehicle.model}",
                    maintenance_type_name=record.maintenance_type.name,
                    due_date=record.next_recommended_date,
                    due_odometer=record.next_recommended_odometer,
                    days_remaining=days_remaining,
                    km_remaining=km_remaining,
                    priority=record.maintenance_type.category.value if record.maintenance_type else "normal",
                    brand=record.vehicle.brand,
                    model=record.vehicle.model,
                    license_plate=record.vehicle.license_plate
                ))
        
        return upcoming
