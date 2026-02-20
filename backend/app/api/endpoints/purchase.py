from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.purchase import PurchaseAlert, PurchaseAlertStatus
from app.schemas.purchase import PurchaseAlertResponse, PurchaseAlertUpdate

router = APIRouter()

@router.get("/", response_model=List[PurchaseAlertResponse])
def get_purchase_alerts(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    status: PurchaseAlertStatus = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve purchase alerts.
    """
    if current_user.role_id not in [1, 2]: # Admin and Moderator only
        raise HTTPException(status_code=403, detail="Not authorized")
        
    query = db.query(PurchaseAlert)
    
    if status:
        query = query.filter(PurchaseAlert.status == status)
        
    alerts = query.order_by(PurchaseAlert.created_at.desc()).offset(skip).limit(limit).all()
    
    # Enrich with item names
    results = []
    for alert in alerts:
        res = PurchaseAlertResponse.model_validate(alert)
        if alert.product:
            res.product_name = alert.product.name
        if alert.tool:
            res.tool_name = alert.tool.name
        if alert.epp:
            res.epp_name = alert.epp.product.name if alert.epp.product else "Unknown EPP"
        results.append(res)
        
    return results

@router.put("/{alert_id}", response_model=PurchaseAlertResponse)
def update_purchase_alert(
    alert_id: int,
    alert_in: PurchaseAlertUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a purchase alert (e.g., mark as ORDERED).
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    alert = db.query(PurchaseAlert).filter(PurchaseAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    update_data = alert_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)
        
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    res = PurchaseAlertResponse.model_validate(alert)
    if alert.product:
        res.product_name = alert.product.name
    if alert.tool:
        res.tool_name = alert.tool.name
    if alert.epp:
        res.epp_name = alert.epp.product.name if alert.epp.product else "Unknown EPP"
        
    return res
