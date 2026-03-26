from typing import List, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.api_key = getattr(settings, 'SENDGRID_API_KEY', None)
        self.from_email = getattr(settings, 'SENDGRID_FROM_EMAIL', 'noreply@exproof.com')
        self.from_name = getattr(settings, 'SENDGRID_FROM_NAME', 'EXPROOF Inventory')
        self.enabled = bool(self.api_key)
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> dict:
        if not self.enabled:
            logger.info(f"Email would be sent to {to_email}: {subject}")
            return {"success": True, "message": "Email service disabled (no API key)"}
        
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content
            
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            if text_content:
                message.content = Content("text/plain", text_content)
            
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            
            return {
                "success": True,
                "message_id": response.headers.get('X-Message-Id', ''),
                "status_code": response.status_code
            }
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_purchase_order_notification(
        self,
        to_email: str,
        order_number: str,
        status: str,
        event: str
    ) -> dict:
        status_messages = {
            "created": "ha sido creada",
            "approved": "ha sido aprobada",
            "rejected": "ha sido rechazada",
            "sent": "ha sido enviada",
            "confirmed": "ha sido confirmada",
            "received": "ha sido recibida",
            "cancelled": "ha sido cancelada"
        }
        
        subject = f"Orden de Compra {order_number} - {status.upper()}"
        status_text = status_messages.get(status.lower(), f"cambió a {status}")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1976d2; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .order-info {{ background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>EXPROOF Inventory</h1>
                    <p>Notificación de Orden de Compra</p>
                </div>
                <div class="content">
                    <p>Estimado usuario,</p>
                    <p>La orden de compra <strong>{order_number}</strong> {status_text}.</p>
                    
                    <div class="order-info">
                        <p><strong>Número de Orden:</strong> {order_number}</p>
                        <p><strong>Estado:</strong> {status.upper()}</p>
                        <p><strong>Evento:</strong> {event.replace('_', ' ').title()}</p>
                    </div>
                    
                    <p>Por favor, inicia sesión en el sistema para ver más detalles.</p>
                </div>
                <div class="footer">
                    <p>Este correo fue enviado automáticamente por EXPROOF Inventory.</p>
                    <p>Si no deseas recibir estas notificaciones, configura tus preferencias en el sistema.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_content)
    
    async def send_low_stock_alert(
        self,
        to_email: str,
        product_name: str,
        sku: str,
        current_stock: float,
        min_stock: float
    ) -> dict:
        subject = f"Alerta: Stock Bajo - {product_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #ff9800; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .alert {{ background-color: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ff9800; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>EXPROOF Inventory</h1>
                    <p>⚠️ Alerta de Stock Bajo</p>
                </div>
                <div class="content">
                    <div class="alert">
                        <p><strong>Producto:</strong> {product_name}</p>
                        <p><strong>SKU:</strong> {sku}</p>
                        <p><strong>Stock Actual:</strong> {current_stock}</p>
                        <p><strong>Stock Mínimo:</strong> {min_stock}</p>
                    </div>
                    <p>Por favor, revisa el inventario y considera crear una orden de compra.</p>
                </div>
                <div class="footer">
                    <p>Este correo fue enviado automáticamente por EXPROOF Inventory.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, html_content)


email_service = EmailService()
