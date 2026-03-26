from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import logging

from app.models.user import User

logger = logging.getLogger(__name__)


class ExpoPushService:
    def __init__(self):
        self.access_token = None
        self.enabled = False
    
    def configure(self, access_token: str):
        self.access_token = access_token
        self.enabled = bool(access_token)
    
    async def send_push_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None
    ) -> dict:
        if not self.enabled:
            logger.info(f"Push notification would be sent to {token}: {title}")
            return {"success": True, "message": "Push service disabled"}
        
        try:
            import httpx
            
            message = {
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
            }
            
            if data:
                message["data"] = data
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://exp.host/--/api/v2/push/send",
                    json=message,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "message_id": result.get("data", {}).get("id", ""),
                        "status": result.get("data", {}).get("status", "")
                    }
                else:
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}: {response.text}"
                    }
        except Exception as e:
            logger.error(f"Failed to send push notification: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_purchase_order_notification(
        self,
        token: str,
        order_number: str,
        status: str,
        event: str
    ) -> dict:
        status_titles = {
            "created": "Orden Creada",
            "approved": "Orden Aprobada",
            "rejected": "Orden Rechazada",
            "sent": "Orden Enviada",
            "confirmed": "Orden Confirmada",
            "received": "Orden Recibida",
            "cancelled": "Orden Cancelada"
        }
        
        title = status_titles.get(status.lower(), f"Orden {status}")
        body = f"Orden de Compra {order_number}"
        
        data = {
            "type": "purchase_order",
            "order_number": order_number,
            "status": status,
            "event": event
        }
        
        return await self.send_push_notification(token, title, body, data)
    
    async def send_low_stock_alert(
        self,
        token: str,
        product_name: str,
        sku: str,
        current_stock: float
    ) -> dict:
        title = "⚠️ Alerta de Stock Bajo"
        body = f"{product_name} (SKU: {sku}) - Stock: {current_stock}"
        
        data = {
            "type": "low_stock",
            "product_name": product_name,
            "sku": sku,
            "current_stock": current_stock
        }
        
        return await self.send_push_notification(token, title, body, data)
    
    async def send_bulk_notifications(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None
    ) -> dict:
        if not tokens:
            return {"success": True, "sent": 0, "failed": 0}
        
        if not self.enabled:
            logger.info(f"Bulk push would be sent to {len(tokens)} devices: {title}")
            return {"success": True, "sent": len(tokens), "failed": 0}
        
        try:
            import httpx
            
            messages = [
                {
                    "to": token,
                    "title": title,
                    "body": body,
                    "sound": "default",
                    **( {"data": data} if data else {} )
                }
                for token in tokens
            ]
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://exp.host/--/api/v2/push/send",
                    json=messages,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    results = response.json()
                    sent = sum(1 for r in results.get("data", []) if r.get("status") == "ok")
                    failed = len(tokens) - sent
                    return {
                        "success": True,
                        "sent": sent,
                        "failed": failed
                    }
                else:
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}: {response.text}"
                    }
        except Exception as e:
            logger.error(f"Failed to send bulk push notifications: {str(e)}")
            return {"success": False, "error": str(e)}


expo_push_service = ExpoPushService()
