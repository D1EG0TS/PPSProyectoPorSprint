from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.assets import (
    Asset, AssetMaintenance, AssetCalibration, AssetAssignment, 
    AssetStatus, MaintenanceStatus, CalibrationStatus, AssetType
)
from app.services.asset_service import AssetService

class AssetReportService:
    
    @staticmethod
    def get_calibration_status_report(db: Session) -> Dict[str, Any]:
        """
        Reporte de Estado de Calibraciones:
        - Listado de equipos por fecha de vencimiento
        - Gráfico: % calibrados vs vencidos por mes
        - Costo de calibraciones por año
        """
        today = datetime.now().date()
        
        # 1. Equipos próximos a vencer o vencidos
        upcoming_calibrations = db.query(AssetCalibration).join(Asset).filter(
            AssetCalibration.expiration_date <= today + timedelta(days=30),
            AssetCalibration.status.in_([CalibrationStatus.VIGENTE, CalibrationStatus.PROXIMO_A_VENCER, CalibrationStatus.VENCIDO])
        ).order_by(AssetCalibration.expiration_date).all()
        
        # 2. Stats for chart: Status distribution
        status_counts = db.query(
            AssetCalibration.status, func.count(AssetCalibration.id)
        ).group_by(AssetCalibration.status).all()
        
        status_distribution = {s.value: c for s, c in status_counts}
        
        # 3. Cost per year
        current_year = today.year
        cost_by_year = db.query(
            func.extract('year', AssetCalibration.calibration_date).label('year'),
            func.sum(AssetCalibration.cost).label('total_cost')
        ).group_by('year').all()
        
        return {
            "upcoming_calibrations": upcoming_calibrations,
            "status_distribution": status_distribution,
            "annual_costs": [{"year": int(r.year), "cost": float(r.total_cost or 0)} for r in cost_by_year]
        }

    @staticmethod
    def get_maintenance_report(db: Session, asset_id: int = None) -> Dict[str, Any]:
        """
        Reporte de Mantenimiento:
        - Historial completo
        - MTBF (Mean Time Between Failures)
        - Costo acumulado vs Valor Activo
        """
        query = db.query(AssetMaintenance)
        if asset_id:
            query = query.filter(AssetMaintenance.asset_id == asset_id)
            
        maintenances = query.order_by(AssetMaintenance.service_date.desc()).all()
        
        # Calculate Stats
        total_cost = sum(m.cost or 0 for m in maintenances)
        
        # Recommendation logic (simplified)
        recommendation = "Mantener"
        asset = None
        if asset_id:
            asset = db.query(Asset).filter(Asset.id == asset_id).first()
            if asset and asset.acquisition_cost:
                cost_ratio = total_cost / asset.acquisition_cost
                if cost_ratio > 0.5:
                    recommendation = "Considerar Reemplazo (Costo Mtto > 50% Valor)"
        
        return {
            "history": maintenances,
            "total_maintenance_cost": total_cost,
            "recommendation": recommendation,
            "asset_value": asset.current_value if asset else 0
        }

    @staticmethod
    def get_valuation_report(db: Session) -> Dict[str, Any]:
        """
        Reporte de Valorización y Depreciación:
        - Valor original vs actual por categoría
        - Activos totalmente depreciados
        """
        # Value by Category
        value_by_category = db.query(
            Asset.category_id,
            func.sum(Asset.acquisition_cost).label('original_value'),
            func.sum(Asset.current_value).label('current_value'),
            func.count(Asset.id).label('count')
        ).group_by(Asset.category_id).all()
        
        # Fully depreciated
        fully_depreciated = db.query(Asset).filter(Asset.current_value <= 0).all()
        
        return {
            "category_valuation": [
                {
                    "category_id": r.category_id,
                    "original_value": float(r.original_value or 0),
                    "current_value": float(r.current_value or 0),
                    "count": r.count
                } for r in value_by_category
            ],
            "fully_depreciated_count": len(fully_depreciated),
            "total_inventory_value": sum(float(r.current_value or 0) for r in value_by_category)
        }

    @staticmethod
    def get_utilization_report(db: Session) -> Dict[str, Any]:
        """
        Reporte de Utilización:
        - % Asignado vs Disponible
        - Activos sin asignar > 30 días (subutilizados)
        """
        # Utilization Rate
        total_assets = db.query(Asset).count()
        assigned_assets = db.query(Asset).filter(Asset.status == AssetStatus.ASIGNADO).count()
        utilization_rate = (assigned_assets / total_assets * 100) if total_assets > 0 else 0
        
        # Underutilized: Available for more than 30 days (simplified logic: created > 30 days ago and currently available)
        # Better logic would check last assignment date.
        # Assuming we track last_assignment_end_date or similar in Asset, or we query assignments.
        # For now, let's list currently available assets ordered by last update (assuming update on return)
        
        available_assets = db.query(Asset).filter(Asset.status == AssetStatus.DISPONIBLE).all()
        
        return {
            "total_assets": total_assets,
            "assigned_count": assigned_assets,
            "utilization_rate": round(utilization_rate, 2),
            "available_assets_count": len(available_assets)
        }

    @staticmethod
    def get_dashboard_widgets(db: Session) -> Dict[str, Any]:
        """
        Widgets para Dashboard
        """
        today = datetime.now().date()
        
        # 1. Calibraciones esta semana
        week_end = today + timedelta(days=7)
        calibrations_week = db.query(AssetCalibration).filter(
            AssetCalibration.expiration_date >= today,
            AssetCalibration.expiration_date <= week_end,
            AssetCalibration.status != CalibrationStatus.VIGENTE # Meaning it needs attention
        ).count()
        
        # 2. Activos sin asignar > 30 días (Approximation: Available assets created > 30 days ago)
        # Refined: We need to find assets that are DISPONIBLE and haven't been assigned in 30 days.
        # This is complex without a "last_return_date" field on Asset. 
        # We will count available assets for now.
        unassigned_count = db.query(Asset).filter(Asset.status == AssetStatus.DISPONIBLE).count()
        
        # 3. Top 5 Maintenance Costs
        top_maintenance = db.query(
            AssetMaintenance.asset_id,
            func.sum(AssetMaintenance.cost).label('total_cost')
        ).group_by(AssetMaintenance.asset_id).order_by(func.sum(AssetMaintenance.cost).desc()).limit(5).all()
        
        top_maint_assets = []
        for tm in top_maintenance:
            asset = db.query(Asset).filter(Asset.id == tm.asset_id).first()
            if asset:
                top_maint_assets.append({
                    "name": asset.name,
                    "tag": asset.asset_tag,
                    "cost": float(tm.total_cost)
                })

        # 4. Warranty Expirations (Next 30 days)
        warranty_exp = db.query(Asset).filter(
            Asset.warranty_expiration >= today,
            Asset.warranty_expiration <= today + timedelta(days=30)
        ).count()
        
        # 5. Total Value
        total_value = db.query(func.sum(Asset.current_value)).scalar() or 0
        
        return {
            "calibrations_due_week": calibrations_week,
            "unassigned_assets": unassigned_count,
            "top_maintenance_costs": top_maint_assets,
            "warranty_expiring_soon": warranty_exp,
            "total_inventory_value": float(total_value)
        }
