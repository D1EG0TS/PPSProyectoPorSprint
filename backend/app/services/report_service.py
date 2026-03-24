from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
from app.models.integrated_request import (
    IntegratedRequest, RequestTool, RequestVehicle, RequestEPP, 
    RequestToolStatus, RequestVehicleStatus, RequestEPPStatus
)
from app.models.tool import Tool
from app.models.vehicle import Vehicle, VehicleDocument
from app.models.epp import EPP
from app.models.user import User
from app.models.movement import Movement, MovementType
from app.models.product import Product
from app.models.inventory_refs import Category

class ReportService:
    @staticmethod
    def get_items_on_loan(db: Session) -> Dict[str, List[Any]]:
        tools = db.query(RequestTool).filter(
            RequestTool.status.in_([RequestToolStatus.PRESTADA, RequestToolStatus.EN_DEVOLUCION])
        ).all()
        
        vehicles = db.query(RequestVehicle).filter(
            RequestVehicle.status.in_([RequestVehicleStatus.EN_USO, RequestVehicleStatus.ASIGNADO, RequestVehicleStatus.EN_DEVOLUCION])
        ).all()
        
        epps = db.query(RequestEPP).filter(
            RequestEPP.status.in_([RequestEPPStatus.ASIGNADO, RequestEPPStatus.ENTREGADO, RequestEPPStatus.EN_DEVOLUCION])
        ).all()
        
        return {
            "tools": tools,
            "vehicles": vehicles,
            "epps": epps
        }

    @staticmethod
    def get_user_responsibility(db: Session, user_id: int) -> Dict[str, List[Any]]:
        tools = db.query(RequestTool).filter(
            RequestTool.assigned_to == user_id,
            RequestTool.status.in_([RequestToolStatus.PRESTADA, RequestToolStatus.EN_DEVOLUCION])
        ).all()
        
        vehicles = db.query(RequestVehicle).filter(
            RequestVehicle.assigned_to == user_id,
            RequestVehicle.status.in_([RequestVehicleStatus.EN_USO, RequestVehicleStatus.ASIGNADO, RequestVehicleStatus.EN_DEVOLUCION])
        ).all()
        
        epps = db.query(RequestEPP).filter(
            RequestEPP.assigned_to == user_id,
            RequestEPP.status.in_([RequestEPPStatus.ASIGNADO, RequestEPPStatus.ENTREGADO, RequestEPPStatus.EN_DEVOLUCION])
        ).all()
        
        return {
            "user_id": user_id,
            "tools": tools,
            "vehicles": vehicles,
            "epps": epps
        }

    @staticmethod
    def get_utilization_stats(db: Session) -> Dict[str, Any]:
        # Top 5 Tools
        top_tools = db.query(
            Tool.name, func.count(RequestTool.id).label('count')
        ).join(RequestTool).group_by(Tool.id).order_by(func.count(RequestTool.id).desc()).limit(5).all()
        
        # Top 5 Vehicles
        top_vehicles = db.query(
            Vehicle.plate, func.count(RequestVehicle.id).label('count')
        ).join(RequestVehicle).group_by(Vehicle.id).order_by(func.count(RequestVehicle.id).desc()).limit(5).all()
        
        # Top 5 EPP
        top_epps = db.query(
            EPP.name, func.count(RequestEPP.id).label('count')
        ).join(RequestEPP).group_by(EPP.id).order_by(func.count(RequestEPP.id).desc()).limit(5).all()
        
        return {
            "top_tools": [{"name": t[0], "count": t[1]} for t in top_tools],
            "top_vehicles": [{"plate": v[0], "count": v[1]} for v in top_vehicles],
            "top_epps": [{"name": e[0], "count": e[1]} for e in top_epps]
        }

    @staticmethod
    def get_inventory_summary(db: Session) -> Dict[str, Any]:
        products = db.query(Product).all()
        
        total_items = 0
        total_value = 0.0
        
        for product in products:
            last_movement = db.query(Movement).filter(
                Movement.product_id == product.id
            ).order_by(Movement.created_at.desc()).first()
            
            stock = last_movement.new_balance if last_movement else 0
            total_items += stock
            total_value += float(product.cost or 0) * stock
        
        return {
            "total_items": total_items,
            "total_value": total_value,
            "total_products": len(products)
        }

    @staticmethod
    def get_movements_daily(db: Session, days: int = 30) -> List[Dict[str, Any]]:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        results = db.query(
            func.date(Movement.created_at).label('date'),
            Movement.type,
            func.abs(func.sum(Movement.quantity)).label('total_quantity')
        ).filter(
            Movement.created_at >= cutoff_date
        ).group_by(
            func.date(Movement.created_at),
            Movement.type
        ).order_by(
            func.date(Movement.created_at).desc()
        ).all()
        
        return [
            {
                "date": str(r.date),
                "type": r.type.value if hasattr(r.type, 'value') else r.type,
                "total_quantity": r.total_quantity
            }
            for r in results
        ]

    @staticmethod
    def get_inventory_turnover(db: Session, period_days: int = 30) -> List[Dict[str, Any]]:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=period_days)
        
        results = db.query(
            Category.name.label('category'),
            func.abs(func.sum(Movement.quantity)).label('total_out')
        ).join(
            Product, Product.category_id == Category.id
        ).join(
            Movement, Movement.product_id == Product.id
        ).filter(
            Movement.created_at >= cutoff_date,
            Movement.type == MovementType.OUT
        ).group_by(
            Category.id,
            Category.name
        ).all()
        
        return [
            {
                "category": r.category,
                "total_out": r.total_out
            }
            for r in results
        ]

    @staticmethod
    def get_movements_summary(db: Session, period: str = "month") -> List[Dict[str, Any]]:
        if period == "month":
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        elif period == "week":
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
        elif period == "year":
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=365)
        else:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        
        results = db.query(
            Movement.type,
            func.count(Movement.id).label('count'),
            func.abs(func.sum(Movement.quantity)).label('total_quantity')
        ).filter(
            Movement.created_at >= cutoff_date
        ).group_by(
            Movement.type
        ).all()
        
        return [
            {
                "type": r.type.value if hasattr(r.type, 'value') else r.type,
                "count": r.count,
                "total_quantity": r.total_quantity
            }
            for r in results
        ]

    @staticmethod
    def get_vehicle_compliance(db: Session) -> Dict[str, Any]:
        today = datetime.now(timezone.utc).date()
        
        total_vehicles = db.query(Vehicle).count()
        
        expired_count = db.query(func.count(func.distinct(VehicleDocument.vehicle_id))).join(
            Vehicle, VehicleDocument.vehicle_id == Vehicle.id
        ).filter(
            VehicleDocument.expiration_date < today
        ).scalar() or 0
        
        compliance_rate = ((total_vehicles - expired_count) / total_vehicles * 100) if total_vehicles > 0 else 100.0
        
        return {
            "total_vehicles": total_vehicles,
            "vehicles_with_expired_docs": expired_count,
            "compliance_rate": round(compliance_rate, 2)
        }

    @staticmethod
    def get_epp_expiration(db: Session, days: int = 30) -> List[Dict[str, Any]]:
        cutoff_date = datetime.now(timezone.utc).date() + timedelta(days=days)
        today = datetime.now(timezone.utc).date()
        
        epps = db.query(EPP).filter(
            EPP.expiration_date != None,
            EPP.expiration_date <= cutoff_date,
            EPP.expiration_date >= today
        ).all()
        
        return [
            {
                "id": epp.id,
                "serial_number": epp.serial_number,
                "product_id": epp.product_id,
                "expiration_date": epp.expiration_date.isoformat() if epp.expiration_date else None,
                "status": epp.status
            }
            for epp in epps
        ]
