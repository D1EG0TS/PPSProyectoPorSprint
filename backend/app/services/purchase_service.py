from sqlalchemy.orm import Session
from app.models.purchase import PurchaseAlert, PurchaseAlertReason, PurchaseAlertStatus
from app.models.product import Product
from app.models.tool import Tool
from app.models.epp import EPP

class PurchaseService:
    @staticmethod
    def create_alert(
        db: Session, 
        reason: PurchaseAlertReason, 
        product_id: int = None, 
        tool_id: int = None, 
        epp_id: int = None, 
        quantity: int = 1,
        notes: str = None
    ) -> PurchaseAlert:
        
        # Check if pending alert already exists to avoid duplicates
        query = db.query(PurchaseAlert).filter(
            PurchaseAlert.status == PurchaseAlertStatus.PENDING,
            PurchaseAlert.reason == reason
        )
        if product_id:
            query = query.filter(PurchaseAlert.product_id == product_id)
        if tool_id:
            query = query.filter(PurchaseAlert.tool_id == tool_id)
        if epp_id:
            query = query.filter(PurchaseAlert.epp_id == epp_id)
            
        existing = query.first()
        if existing:
            # Update quantity if applicable
            existing.quantity_needed += quantity
            existing.notes = (existing.notes or "") + f"\nUpdate: {notes}" if notes else existing.notes
            db.commit()
            db.refresh(existing)
            return existing

        priority = "MEDIUM"
        if reason in [PurchaseAlertReason.LOST, PurchaseAlertReason.DAMAGED]:
            priority = "HIGH"
        
        alert = PurchaseAlert(
            product_id=product_id,
            tool_id=tool_id,
            epp_id=epp_id,
            reason=reason,
            quantity_needed=quantity,
            priority=priority,
            notes=notes,
            status=PurchaseAlertStatus.PENDING
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    @staticmethod
    def check_low_stock(db: Session, product_id: int, new_balance: int):
        product = db.query(Product).get(product_id)
        if not product or not product.min_stock:
            return
            
        if new_balance <= product.min_stock:
            PurchaseService.create_alert(
                db, 
                reason=PurchaseAlertReason.LOW_STOCK, 
                product_id=product_id, 
                quantity=product.target_stock - new_balance if product.target_stock else product.min_stock * 2,
                notes=f"Stock actual ({new_balance}) bajo el mínimo ({product.min_stock})"
            )
