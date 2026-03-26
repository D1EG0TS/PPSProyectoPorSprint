from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from decimal import Decimal

from app.api import deps
from app.models.user import User
from app.models.supplier import Supplier, SupplierStatus
from app.models.purchase_order import PurchaseOrder
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse, SupplierStats
)
import time

router = APIRouter()


@router.get("/", response_model=SupplierListResponse)
def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = db.query(Supplier)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Supplier.name.ilike(search_term),
                Supplier.code.ilike(search_term),
                Supplier.email.ilike(search_term),
                Supplier.contact_person.ilike(search_term)
            )
        )
    
    if status:
        query = query.filter(Supplier.status == status)
    
    if category:
        query = query.filter(Supplier.category == category)
    
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    
    total = query.count()
    suppliers = query.order_by(Supplier.name).offset(skip).limit(limit).all()
    
    return {"total": total, "suppliers": suppliers}


@router.post("/", response_model=SupplierResponse, status_code=201)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    if supplier_in.code:
        existing = db.query(Supplier).filter(Supplier.code == supplier_in.code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Supplier code already exists")
    else:
        from app.database import engine
        prefix = "SUP"
        max_id = db.query(Supplier.id).order_by(Supplier.id.desc()).first()
        next_num = (max_id[0] if max_id else 0) + 1
        supplier_in.code = f"{prefix}{next_num:05d}"
    
    supplier = Supplier(
        **supplier_in.model_dump(),
        created_by=current_user.id,
        created_at=int(time.time())
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = supplier_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    
    supplier.updated_by = current_user.id
    supplier.updated_at = int(time.time())
    
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1]))
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    supplier.is_active = False
    supplier.status = SupplierStatus.INACTIVE
    supplier.updated_by = current_user.id
    supplier.updated_at = int(time.time())
    
    db.commit()
    return {"success": True, "message": "Supplier deactivated"}


@router.get("/stats/overview", response_model=SupplierStats)
def get_supplier_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    total = db.query(Supplier).filter(Supplier.is_active == True).count()
    active = db.query(Supplier).filter(
        Supplier.is_active == True,
        Supplier.status == SupplierStatus.ACTIVE
    ).count()
    pending = db.query(Supplier).filter(
        Supplier.is_active == True,
        Supplier.status == SupplierStatus.PENDING
    ).count()
    blocked = db.query(Supplier).filter(
        Supplier.is_active == True,
        Supplier.status == SupplierStatus.BLOCKED
    ).count()
    
    from app.models.purchase_order import PurchaseOrderStatus
    total_orders = db.query(PurchaseOrder).filter(PurchaseOrder.is_active == True).count()
    pending_orders = db.query(PurchaseOrder).filter(
        PurchaseOrder.is_active == True,
        PurchaseOrder.status.in_([
            PurchaseOrderStatus.PENDING_APPROVAL,
            PurchaseOrderStatus.APPROVED,
            PurchaseOrderStatus.SENT,
            PurchaseOrderStatus.CONFIRMED,
            PurchaseOrderStatus.IN_PROGRESS
        ])
    ).count()
    
    total_amount = db.query(PurchaseOrder.total_amount).filter(
        PurchaseOrder.is_active == True
    ).all()
    total_sum = sum(float(a[0] or 0) for a in total_amount)
    
    return {
        "total_suppliers": total,
        "active_suppliers": active,
        "pending_suppliers": pending,
        "blocked_suppliers": blocked,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_amount": Decimal(str(total_sum)),
    }
