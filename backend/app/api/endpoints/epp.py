from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta, date

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.epp import EPP, EPPInspection, EPPStatus
from app.models.product import Product
from app.schemas.epp import EPPCreate, EPPUpdate, EPPResponse, InspectionCreate, InspectionResponse

router = APIRouter()

@router.post("/", response_model=EPPResponse)
def create_epp(epp: EPPCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Validate product
    product = db.query(Product).filter(Product.id == epp.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    db_epp = EPP(**epp.model_dump())
    db.add(db_epp)
    db.commit()
    db.refresh(db_epp)
    return db_epp

@router.get("/", response_model=List[EPPResponse])
def get_epps(
    skip: int = 0, 
    limit: int = 100, 
    assigned_to: Optional[int] = None,
    status: Optional[EPPStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(EPP).options(joinedload(EPP.product))
    
    if assigned_to is not None:
        query = query.filter(EPP.assigned_to == assigned_to)
        
    if status is not None:
        query = query.filter(EPP.status == status)
        
    return query.offset(skip).limit(limit).all()

@router.get("/expiring", response_model=List[EPPResponse])
def get_expiring_epp(days: int = 5, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get EPPs expiring within 'days' days from now.
    Only includes ASSIGNED EPPs that haven't already expired (or expired recently).
    """
    target_date = date.today() + timedelta(days=days)
    return db.query(EPP).options(joinedload(EPP.product)).filter(
        EPP.status == EPPStatus.ASSIGNED,
        EPP.expiration_date <= target_date,
        EPP.expiration_date >= date.today() # Don't show already expired? Or maybe show them too? Prompt says "próximos a caducar".
        # Usually we want to see what IS expiring soon.
    ).all()

@router.post("/{id}/inspect", response_model=InspectionResponse)
def inspect_epp(id: int, inspection: InspectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    epp = db.query(EPP).filter(EPP.id == id).first()
    if not epp:
        raise HTTPException(status_code=404, detail="EPP not found")
        
    db_inspection = EPPInspection(
        epp_id=id,
        inspector_id=current_user.id,
        **inspection.model_dump()
    )
    db.add(db_inspection)
    
    # Update EPP status if failed
    if not inspection.passed:
        epp.status = EPPStatus.DAMAGED
    
    db.commit()
    db.refresh(db_inspection)
    return db_inspection

@router.post("/{id}/replace", response_model=EPPResponse)
def replace_epp(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a replacement for an EPP.
    Retires the old one and creates a new one with same specs, assigned to same user.
    """
    old_epp = db.query(EPP).filter(EPP.id == id).first()
    if not old_epp:
        raise HTTPException(status_code=404, detail="EPP not found")
        
    if old_epp.status == EPPStatus.REPLACED:
         raise HTTPException(status_code=400, detail="EPP already replaced")

    # Retire old EPP
    old_epp.status = EPPStatus.REPLACED
    # We don't necessarily change expiration date of old one, but status is enough.
    
    # Create new EPP
    new_epp = EPP(
        product_id=old_epp.product_id,
        size=old_epp.size,
        certification=old_epp.certification,
        useful_life_days=old_epp.useful_life_days,
        status=EPPStatus.AVAILABLE,
        assigned_to=old_epp.assigned_to
    )
    
    # Auto-assign if user was assigned
    if new_epp.assigned_to:
        new_epp.status = EPPStatus.ASSIGNED
        new_epp.assignment_date = date.today()
        if new_epp.useful_life_days:
            new_epp.expiration_date = date.today() + timedelta(days=new_epp.useful_life_days)
            
    db.add(new_epp)
    db.commit()
    db.refresh(new_epp)
    return new_epp

@router.post("/{id}/assign", response_model=EPPResponse)
def assign_epp(id: int, user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    epp = db.query(EPP).filter(EPP.id == id).first()
    if not epp:
        raise HTTPException(status_code=404, detail="EPP not found")
    
    # Validate user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    epp.assigned_to = user_id
    epp.status = EPPStatus.ASSIGNED
    epp.assignment_date = date.today()
    
    if epp.useful_life_days:
        epp.expiration_date = date.today() + timedelta(days=epp.useful_life_days)
        
    db.commit()
    db.refresh(epp)
    return epp
