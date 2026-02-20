from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from app.models.assets import (
    Asset, AssetCategory, AssetAttribute, AssetMaintenance, AssetCalibration,
    AssetAssignment, AssetAuditLog, AssetDepreciation,
    AssetStatus, AssetAction, MaintenanceStatus, CalibrationStatus, AssignmentStatus, DepreciationMethod,
    AssetType
)
from app.schemas.assets import (
    AssetCreate, AssetUpdate, AssetMaintenanceCreate, AssetCalibrationCreate, AssetAssignmentCreate
)
from app.models.user import User
from app.services.notification_service import NotificationService
from app.models.notification import NotificationType

class AssetService:
    @staticmethod
    def run_daily_checks(db: Session):
        """
        Ejecuta verificaciones diarias y genera alertas/notificaciones
        """
        today = datetime.now().date()
        alerts_generated = 0
        
        # 1. Check Calibrations Due (30, 15, 7 days)
        thresholds = [30, 15, 7]
        for days in thresholds:
            target_date = today + timedelta(days=days)
            calibrations = db.query(AssetCalibration).filter(
                AssetCalibration.expiration_date == target_date,
                AssetCalibration.status == CalibrationStatus.VIGENTE
            ).all()
            
            for cal in calibrations:
                # Update status
                cal.status = CalibrationStatus.PROXIMO_A_VENCER
                # Create Notification
                asset = db.query(Asset).filter(Asset.id == cal.asset_id).first()
                if asset and asset.responsible_user_id:
                    NotificationService.create_notification(
                        db=db,
                        user_id=asset.responsible_user_id,
                        title=f"Alerta de Calibración: {asset.name}",
                        message=f"La calibración del activo {asset.asset_tag} vence en {days} días.",
                        type=NotificationType.WARNING
                    )
                alerts_generated += 1
        
        # 2. Check Warranties Expiring (30 days)
        warranties = db.query(Asset).filter(
            Asset.warranty_expiration == today + timedelta(days=30)
        ).all()
        
        for asset in warranties:
            # Notify Admins (Assuming Role 1/2, but for now we notify responsible if exists or just log)
            # Ideally notify a specific role. Here we simplify.
            if asset.responsible_user_id:
                 NotificationService.create_notification(
                    db=db,
                    user_id=asset.responsible_user_id,
                    title=f"Garantía por Vencer: {asset.name}",
                    message=f"La garantía del activo {asset.asset_tag} vence en 30 días.",
                    type=NotificationType.INFO
                )
            alerts_generated += 1

        db.commit()
        return alerts_generated

    @staticmethod
    def generate_asset_tag(db: Session, category_code: str) -> str:
        # Format: ACT-YEAR-SEQUENTIAL
        # Use a more generic prefix based on category if needed, but requirements say "ACT-AÑO-SECUENCIAL"
        year = datetime.now().year
        prefix = f"ACT-{year}-"
        
        # Find last asset tag for this year
        last_asset = db.query(Asset).filter(Asset.asset_tag.like(f"{prefix}%")).order_by(Asset.id.desc()).first()
        
        if last_asset:
            try:
                # Extract sequence
                parts = last_asset.asset_tag.split('-')
                if len(parts) >= 3:
                    last_seq = int(parts[-1])
                    new_seq = last_seq + 1
                else:
                    new_seq = 1
            except ValueError:
                new_seq = 1
        else:
            new_seq = 1
            
        return f"{prefix}{new_seq:04d}"

    @staticmethod
    def create_asset(db: Session, asset_in: AssetCreate, user_id: int) -> Asset:
        category = db.query(AssetCategory).filter(AssetCategory.id == asset_in.category_id).first()
        if not category:
            raise ValueError("Category not found")

        asset_tag = asset_in.asset_tag
        if not asset_tag:
            asset_tag = AssetService.generate_asset_tag(db, category.code)
        
        db_obj = Asset(
            asset_tag=asset_tag,
            category_id=asset_in.category_id,
            name=asset_in.name,
            brand=asset_in.brand,
            model=asset_in.model,
            serial_number=asset_in.serial_number,
            barcode=asset_in.barcode,
            acquisition_date=asset_in.acquisition_date,
            acquisition_cost=asset_in.acquisition_cost,
            current_value=asset_in.acquisition_cost, # Initial value = cost
            supplier=asset_in.supplier,
            invoice_number=asset_in.invoice_number,
            warranty_expiration=asset_in.warranty_expiration,
            location_id=asset_in.location_id,
            warehouse_id=asset_in.warehouse_id,
            responsible_user_id=asset_in.responsible_user_id,
            status=asset_in.status,
            condition=asset_in.condition,
            notes=asset_in.notes
        )
        db.add(db_obj)
        db.flush() # to get ID
        
        # Add attributes
        if asset_in.attributes:
            for attr in asset_in.attributes:
                db_attr = AssetAttribute(
                    asset_id=db_obj.id,
                    attribute_name=attr.attribute_name,
                    attribute_value=attr.attribute_value,
                    attribute_type=attr.attribute_type
                )
                db.add(db_attr)
        
        # Log creation
        AssetService.log_action(db, db_obj.id, AssetAction.CREADO, user_id=user_id, new_val=asset_in.dict())
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def update_asset(db: Session, asset_id: int, asset_in: AssetUpdate, user_id: int) -> Optional[Asset]:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            return None
            
        prev_val = {c.name: getattr(asset, c.name) for c in asset.__table__.columns}
        update_data = asset_in.dict(exclude_unset=True)
        
        # Handle attributes update separately
        attributes_in = update_data.pop('attributes', None)
        
        for field, value in update_data.items():
            setattr(asset, field, value)
            
        if attributes_in:
            # Simple strategy: delete existing and recreate (or update if ID provided, but schema creates new)
            # For simplicity, we might just append new ones or clear and add. 
            # Ideally update logic should be more sophisticated, but let's stick to adding new ones for now
            # or assuming the frontend sends delta.
            # Given schema AssetAttributeCreate, it implies adding.
            # Let's clear and re-add if we want full sync, but that's dangerous.
            # Let's assume attributes are being added or updated by name.
            for attr in attributes_in:
                existing_attr = db.query(AssetAttribute).filter(
                    AssetAttribute.asset_id == asset.id,
                    AssetAttribute.attribute_name == attr.attribute_name
                ).first()
                
                if existing_attr:
                    existing_attr.attribute_value = attr.attribute_value
                    existing_attr.attribute_type = attr.attribute_type
                else:
                    new_attr = AssetAttribute(
                        asset_id=asset.id,
                        attribute_name=attr.attribute_name,
                        attribute_value=attr.attribute_value,
                        attribute_type=attr.attribute_type
                    )
                    db.add(new_attr)

        AssetService.log_action(db, asset.id, AssetAction.VALOR_ACTUALIZADO, user_id=user_id, prev_val=prev_val, new_val=update_data)
        
        db.commit()
        db.refresh(asset)
        return asset

    @staticmethod
    def log_action(db: Session, asset_id: int, action: AssetAction, user_id: Optional[int] = None, 
                   prev_val: Optional[Dict] = None, new_val: Optional[Dict] = None):
        # Convert date/datetime objects to string for JSON serialization
        def json_serial(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            return str(obj)

        # We need to serialize the dicts carefully
        # But for now, let's assume SQLAlchemy/Pydantic handles basic types, 
        # but pure dicts might need help if they contain dates.
        # Since JSON type in Postgres/SQLAlchemy usually handles basic types, let's rely on that.
        # But to be safe with dates in dicts:
        if prev_val:
            prev_val = {k: json_serial(v) if isinstance(v, (date, datetime)) else v for k, v in prev_val.items()}
        if new_val:
            new_val = {k: json_serial(v) if isinstance(v, (date, datetime)) else v for k, v in new_val.items()}

        log = AssetAuditLog(
            asset_id=asset_id,
            action=action,
            user_id=user_id,
            previous_value=prev_val,
            new_value=new_val,
            timestamp=datetime.now()
        )
        db.add(log)

    @staticmethod
    def calculate_depreciation(db: Session, asset_id: int) -> Optional[AssetDepreciation]:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset or not asset.category.depreciable:
            return None
            
        if not asset.acquisition_cost or not asset.acquisition_date:
            return None

        # Linear method
        if asset.category.depreciation_method == DepreciationMethod.LINEAL:
            months_life = asset.category.useful_life_months
            if not months_life:
                return None
                
            monthly_depreciation = float(asset.acquisition_cost) / months_life
            
            # Calculate months since acquisition
            today = date.today()
            months_passed = (today.year - asset.acquisition_date.year) * 12 + (today.month - asset.acquisition_date.month)
            
            if months_passed <= 0:
                return None
                
            calculated_depreciation = monthly_depreciation * months_passed
            current_value_should_be = float(asset.acquisition_cost) - calculated_depreciation
            
            if current_value_should_be < 0:
                current_value_should_be = 0
                
            # Check if we need to update
            current_recorded_value = float(asset.current_value) if asset.current_value is not None else float(asset.acquisition_cost)
            
            depreciation_amount = current_recorded_value - current_value_should_be
            
            if depreciation_amount <= 0:
                return None # Already depreciated or value increased (unlikely)

            # Record depreciation
            depreciation = AssetDepreciation(
                asset_id=asset.id,
                depreciation_date=today,
                previous_value=current_recorded_value,
                depreciation_amount=depreciation_amount,
                new_value=current_value_should_be,
                method=DepreciationMethod.LINEAL
            )
            
            asset.current_value = current_value_should_be
            db.add(depreciation)
            db.commit()
            return depreciation
            
        return None

class MaintenanceService:
    @staticmethod
    def schedule_maintenance(db: Session, data: AssetMaintenanceCreate, user_id: int) -> AssetMaintenance:
        db_obj = AssetMaintenance(
            asset_id=data.asset_id,
            maintenance_type=data.maintenance_type,
            service_date=data.service_date,
            description=data.description,
            technician=data.technician,
            cost=data.cost,
            status=MaintenanceStatus.PROGRAMADO,
            notes=data.notes,
            attachments=data.attachments,
            performed_by=user_id # Initial requester/scheduler
        )
        db.add(db_obj)
        
        # Update asset status
        asset = db.query(Asset).filter(Asset.id == data.asset_id).first()
        if asset:
            # Only update status if it's immediate or we want to reflect "scheduled" state?
            # Usually scheduled maintenance doesn't change asset status until it starts.
            # But let's follow requirements if any.
            # "status: ENUM('programado', ...)" is for maintenance record.
            # Asset status: 'en_mantenimiento' usually implies it's happening now.
            pass
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

class CalibrationService:
    @staticmethod
    def schedule_calibration(db: Session, data: AssetCalibrationCreate, user_id: int) -> AssetCalibration:
        db_obj = AssetCalibration(
            asset_id=data.asset_id,
            calibration_date=data.calibration_date,
            expiration_date=data.expiration_date,
            calibration_lab=data.calibration_lab,
            status=CalibrationStatus.PROXIMO_A_VENCER, # Default logic? Or VIGENTE if done?
            # If scheduling future: PROXIMO_A_VENCER or just wait. 
            # The schema Create suggests we are recording a calibration or scheduling?
            # "POST /assets/{id}/calibrate # Registrar calibración" implies recording a done calibration.
            # "GET /assets/calibration/due" implies checking schedule.
            # Let's assume this creates a record. If date is past/today, it's done.
        )
        # If it's a completed calibration record:
        if data.passed is not None:
             db_obj.passed = data.passed
             db_obj.status = CalibrationStatus.VIGENTE if data.passed else CalibrationStatus.VENCIDO
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
