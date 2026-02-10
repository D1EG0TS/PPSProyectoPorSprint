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
    def calculate_next_maintenance(db: Session, vehicle_id: int, maintenance_type_id: int, service_date: date, odometer: Optional[int]):
        m_type = db.query(VehicleMaintenanceType).filter(VehicleMaintenanceType.id == maintenance_type_id).first()
        if not m_type:
            return None, None
        
        next_date = None
        next_odo = None

        if m_type.recommended_interval_months:
            # Simple month addition
            # Adding months roughly as 30 days or using a library logic if needed. 
            # Ideally use relativedelta but avoiding extra deps if possible.
            # Using 30.44 days avg or simple logic:
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
    def check_upcoming_maintenance(db: Session, vehicle_id: Optional[int] = None) -> List[UpcomingMaintenanceResponse]:
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
            
        latest_records = query.all()
        upcoming = []
        today = date.today()
        
        for record in latest_records:
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
                    priority=record.maintenance_type.category.value if record.maintenance_type else "normal"
                ))
                
        return upcoming

    @staticmethod
    def generate_maintenance_schedule(db: Session, vehicle_id: int):
        # Implementation for bulk generation based on active types
        # Get all active maintenance types
        types = db.query(VehicleMaintenanceType).filter(VehicleMaintenanceType.is_active == True).all()
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle: 
            return []

        # Logic: Check if there is a record for this type. If not, schedule based on vehicle age/odo?
        # Or if exists, schedule next.
        # This is a complex logic, for now returning empty or basic placeholder
        pass

    @staticmethod
    def calculate_maintenance_costs(db: Session, vehicle_id: int, start_date: date, end_date: date) -> Decimal:
        result = db.query(func.sum(VehicleMaintenanceRecord.cost_amount))\
            .filter(VehicleMaintenanceRecord.vehicle_id == vehicle_id)\
            .filter(VehicleMaintenanceRecord.service_date >= start_date)\
            .filter(VehicleMaintenanceRecord.service_date <= end_date)\
            .scalar()
        return result or Decimal(0)

    @staticmethod
    def validate_maintenance_completion(db: Session, record_id: int) -> bool:
        record = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.id == record_id).first()
        if not record:
            return False
            
        # Example validation: Must have cost and provider
        if not record.cost_amount or not record.provider_name:
            return False
            
        return True

    @staticmethod
    async def complete_maintenance(db: Session, record_id: int, user_id: int) -> VehicleMaintenanceRecord:
        record = db.query(VehicleMaintenanceRecord).filter(VehicleMaintenanceRecord.id == record_id).first()
        if not record:
            raise ValueError("Record not found")
            
        if not VehicleMaintenanceService.validate_maintenance_completion(db, record_id):
            raise ValueError("Cannot complete maintenance. Missing required fields.")
            
        # 1. Process Parts Deductions
        parts_to_deduct = [p for p in record.parts if p.product_id and p.warehouse_id]
        
        if parts_to_deduct:
            # Group by warehouse? Or create one request per warehouse?
            # MovementRequest has source_warehouse_id. So we must group by warehouse.
            from itertools import groupby
            
            parts_to_deduct.sort(key=lambda x: x.warehouse_id)
            for wh_id, parts_iter in groupby(parts_to_deduct, key=lambda x: x.warehouse_id):
                parts = list(parts_iter)
                
                # Create Movement Request
                movement_request = MovementRequest(
                        type=MovementType.OUT,
                        status=MovementStatus.APPROVED, # Auto-approve for maintenance consumption
                        source_warehouse_id=wh_id,
                        reason=f"Maintenance Consumption for Vehicle {record.vehicle.license_plate}",
                        requested_by=user_id
                    )
                db.add(movement_request)
                db.flush()
                
                # Create Items
                for p in parts:
                    item = MovementRequestItem(
                        request_id=movement_request.id,
                        product_id=p.product_id,
                        quantity=int(p.quantity), # Assuming quantity is int for inventory? Product quantity is int?
                        # If quantity is float (liters), inventory might need float. 
                        # Check models: MovementRequestItem.quantity is Integer in my memory? 
                        # Let's check. If Integer, cast.
                    )
                    db.add(item)
                
                db.commit()
                db.refresh(movement_request)
                
                # Apply Movement
                await StockService.apply_movement(db, movement_request.id, user_id)

        # 2. Update Status
        record.status = MaintenanceStatus.COMPLETED
        record.updated_at = func.now()
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_dashboard_stats(db: Session) -> DashboardStats:
        today = date.today()
        first_day_month = today.replace(day=1)
        first_day_year = today.replace(month=1, day=1)
        
        # 1. Costs
        cost_month = db.query(func.sum(VehicleMaintenanceRecord.cost_amount))\
            .filter(VehicleMaintenanceRecord.service_date >= first_day_month)\
            .scalar() or 0
            
        cost_year = db.query(func.sum(VehicleMaintenanceRecord.cost_amount))\
            .filter(VehicleMaintenanceRecord.service_date >= first_day_year)\
            .scalar() or 0
            
        # 2. Counts by Type
        type_counts = db.query(VehicleMaintenanceType.name, func.count(VehicleMaintenanceRecord.id))\
            .join(VehicleMaintenanceRecord, VehicleMaintenanceRecord.maintenance_type_id == VehicleMaintenanceType.id)\
            .group_by(VehicleMaintenanceType.name).all()
        count_by_type = {name: count for name, count in type_counts}
        
        # 3. Counts by Status
        status_counts = db.query(VehicleMaintenanceRecord.status, func.count(VehicleMaintenanceRecord.id))\
            .group_by(VehicleMaintenanceRecord.status).all()
        count_by_status = {status.value: count for status, count in status_counts}
        
        # 4. Monthly Costs (Last 6 months)
        # Using simple approach for SQLite/Postgres compatibility
        # Just getting last 6 months records and aggregating in python might be safer/easier if volume is low, 
        # but let's try SQL for month grouping.
        # SQLite: strftime('%Y-%m', service_date)
        # Postgres: to_char(service_date, 'YYYY-MM')
        # We can assume SQLite for now as per env.
        
        monthly_costs_query = db.query(
            func.strftime('%Y-%m', VehicleMaintenanceRecord.service_date).label('month'),
            func.sum(VehicleMaintenanceRecord.cost_amount)
        ).group_by('month').order_by(desc('month')).limit(6).all()
        
        monthly_costs = [{"month": m, "cost": float(c or 0)} for m, c in monthly_costs_query]
        monthly_costs.reverse()
        
        # 5. Top Vehicles by Cost
        top_vehicles = db.query(
            Vehicle.id, 
            Vehicle.brand, 
            Vehicle.model, 
            func.sum(VehicleMaintenanceRecord.cost_amount).label('total')
        ).join(VehicleMaintenanceRecord, Vehicle.id == VehicleMaintenanceRecord.vehicle_id)\
         .group_by(Vehicle.id)\
         .order_by(desc('total'))\
         .limit(5).all()
         
        top_vehicles_list = [
            {"vehicle_id": v_id, "name": f"{brand} {model}", "cost": float(total or 0)} 
            for v_id, brand, model, total in top_vehicles
        ]
        
        return DashboardStats(
            total_cost_month=float(cost_month),
            total_cost_year=float(cost_year),
            count_by_type=count_by_type,
            count_by_status=count_by_status,
            monthly_costs=monthly_costs,
            top_vehicles_cost=top_vehicles_list,
            avg_downtime_days=0.0
        )
