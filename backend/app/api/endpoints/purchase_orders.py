from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from decimal import Decimal

from app.api import deps
from app.models.user import User
from app.models.supplier import Supplier
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus as POStatus
from app.schemas.purchase_order import (
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse,
    PurchaseOrderListResponse, PurchaseOrderStats
)
import time

router = APIRouter()


@router.get("/", response_model=PurchaseOrderListResponse)
def list_purchase_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    supplier_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.items))
    
    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    
    if status:
        query = query.filter(PurchaseOrder.status == status)
    
    if priority:
        query = query.filter(PurchaseOrder.priority == priority)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(PurchaseOrder.order_number.ilike(search_term))
    
    query = query.filter(PurchaseOrder.is_active == True)
    
    total = query.count()
    orders = query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()
    
    return {"total": total, "orders": orders}


@router.post("/", response_model=PurchaseOrderResponse, status_code=201)
def create_purchase_order(
    order_in: PurchaseOrderCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2, 3]))
):
    supplier = db.query(Supplier).filter(Supplier.id == order_in.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    from app.database import engine
    prefix = "PO"
    max_id = db.query(PurchaseOrder.id).order_by(PurchaseOrder.id.desc()).first()
    next_num = (max_id[0] if max_id else 0) + 1
    order_number = f"{prefix}{next_num:06d}"
    
    order = PurchaseOrder(
        order_number=order_number,
        supplier_id=order_in.supplier_id,
        priority=order_in.priority,
        expected_delivery_date=order_in.expected_delivery_date,
        shipping_address=order_in.shipping_address,
        billing_address=order_in.billing_address,
        notes=order_in.notes,
        internal_notes=order_in.internal_notes,
        currency=order_in.currency or "MXN",
        exchange_rate=order_in.exchange_rate or Decimal("1"),
        shipping_cost=order_in.shipping_cost or Decimal("0"),
        status=POStatus.DRAFT,
        created_by=current_user.id,
        created_at=int(time.time())
    )
    db.add(order)
    db.flush()
    
    subtotal = Decimal("0")
    for item_in in order_in.items:
        total_price = item_in.quantity * item_in.unit_price
        subtotal += total_price
        
        item = PurchaseOrderItem(
            purchase_order_id=order.id,
            product_id=item_in.product_id,
            product_sku=item_in.product_sku,
            product_name=item_in.product_name,
            quantity=item_in.quantity,
            quantity_received=Decimal("0"),
            unit_price=item_in.unit_price,
            total_price=total_price,
            expected_delivery_date=item_in.expected_delivery_date,
            notes=item_in.notes,
            status="pending",
            created_at=int(time.time())
        )
        db.add(item)
    
    tax_amount = subtotal * Decimal("0.16")
    order.subtotal = subtotal
    order.tax_amount = tax_amount
    order.total_amount = subtotal + tax_amount + (order.shipping_cost or Decimal("0"))
    
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    order = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.items)).filter(
        PurchaseOrder.id == order_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return order


@router.put("/{order_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    order_id: int,
    order_in: PurchaseOrderUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2, 3]))
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status == POStatus.RECEIVED:
        raise HTTPException(status_code=400, detail="Cannot modify a received order")
    
    update_data = order_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "status" and value:
            setattr(order, field, POStatus(value))
        else:
            setattr(order, field, value)
    
    order.updated_by = current_user.id
    order.updated_at = int(time.time())
    
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/submit", response_model=PurchaseOrderResponse)
def submit_purchase_order(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2, 3]))
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status != POStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft orders can be submitted")
    
    order.status = POStatus.PENDING_APPROVAL
    order.updated_by = current_user.id
    order.updated_at = int(time.time())
    
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/approve", response_model=PurchaseOrderResponse)
def approve_purchase_order(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status != POStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=400, detail="Only pending orders can be approved")
    
    order.status = POStatus.APPROVED
    order.approved_by = current_user.id
    order.approved_at = int(time.time())
    order.updated_by = current_user.id
    order.updated_at = int(time.time())
    
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/reject", response_model=PurchaseOrderResponse)
def reject_purchase_order(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status != POStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=400, detail="Only pending orders can be rejected")
    
    order.status = POStatus.REJECTED
    order.updated_by = current_user.id
    order.updated_at = int(time.time())
    
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/send", response_model=PurchaseOrderResponse)
def send_purchase_order(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2, 3]))
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status != POStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only approved orders can be sent")
    
    order.status = POStatus.SENT
    order.sent_at = int(time.time())
    order.updated_by = current_user.id
    order.updated_at = int(time.time())
    
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/receive", response_model=PurchaseOrderResponse)
def receive_purchase_order(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2, 3]))
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status not in [POStatus.CONFIRMED, POStatus.IN_PROGRESS, POStatus.PARTIALLY_RECEIVED]:
        raise HTTPException(status_code=400, detail="Order must be confirmed or in progress to receive")
    
    order.status = POStatus.RECEIVED
    order.actual_delivery_date = None
    order.updated_by = current_user.id
    order.updated_at = int(time.time())
    
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/cancel", response_model=PurchaseOrderResponse)
def cancel_purchase_order(
    order_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status in [POStatus.RECEIVED, POStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Cannot cancel a received or already cancelled order")
    
    order.status = POStatus.CANCELLED
    order.updated_by = current_user.id
    order.updated_at = int(time.time())
    
    db.commit()
    db.refresh(order)
    return order


@router.get("/stats/overview", response_model=PurchaseOrderStats)
def get_purchase_order_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = db.query(PurchaseOrder).filter(PurchaseOrder.is_active == True)
    
    total = query.count()
    draft = query.filter(PurchaseOrder.status == POStatus.DRAFT).count()
    pending = query.filter(PurchaseOrder.status == POStatus.PENDING_APPROVAL).count()
    approved = query.filter(
        PurchaseOrder.status.in_([
            POStatus.APPROVED, POStatus.SENT, POStatus.CONFIRMED,
            POStatus.IN_PROGRESS, POStatus.PARTIALLY_RECEIVED
        ])
    ).count()
    received = query.filter(PurchaseOrder.status == POStatus.RECEIVED).count()
    cancelled = query.filter(PurchaseOrder.status == POStatus.CANCELLED).count()
    
    total_amount = query.with_entities(PurchaseOrder.total_amount).all()
    pending_amount = query.filter(
        PurchaseOrder.status.in_([
            POStatus.PENDING_APPROVAL, POStatus.APPROVED, POStatus.SENT,
            POStatus.CONFIRMED, POStatus.IN_PROGRESS
        ])
    ).with_entities(PurchaseOrder.total_amount).all()
    
    return {
        "total_orders": total,
        "draft_orders": draft,
        "pending_orders": pending,
        "approved_orders": approved,
        "received_orders": received,
        "cancelled_orders": cancelled,
        "total_amount": sum(Decimal(str(a[0] or 0)) for a in total_amount),
        "pending_amount": sum(Decimal(str(a[0] or 0)) for a in pending_amount),
    }
