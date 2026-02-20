from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from app.models.integrated_request import (
    IntegratedRequest, RequestTool, RequestVehicle, RequestEPP, 
    RequestToolStatus, RequestVehicleStatus, RequestEPPStatus
)
from app.models.tool import Tool
from app.models.vehicle import Vehicle
from app.models.epp import EPP
from app.models.user import User

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
