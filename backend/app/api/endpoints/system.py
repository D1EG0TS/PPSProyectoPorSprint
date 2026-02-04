from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.api import deps
from app.models.system import SystemConfig
from app.models.user import User, UserAudit
from app.models.product import Product
from app.models.movement import Movement
from app.schemas import system as schemas

router = APIRouter()

def check_super_admin(current_user: User = Depends(deps.get_current_user)):
    # Role 1 is Super Admin
    if current_user.role_id != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Only Super Admin can access system module."
        )
    return current_user

@router.get("/config", response_model=List[schemas.SystemConfig])
def get_system_config(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(check_super_admin)
):
    return db.query(SystemConfig).all()

@router.put("/config", response_model=schemas.SystemConfig)
def update_system_config(
    config_in: schemas.SystemConfigCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(check_super_admin)
):
    # Upsert logic
    config = db.query(SystemConfig).filter(SystemConfig.key == config_in.key).first()
    if config:
        config.value = config_in.value
        if config_in.description:
            config.description = config_in.description
    else:
        config = SystemConfig(
            key=config_in.key,
            value=config_in.value,
            description=config_in.description
        )
        db.add(config)
    
    db.commit()
    db.refresh(config)
    return config

@router.get("/logs", response_model=List[schemas.AuditLogOut])
def get_audit_logs(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(check_super_admin),
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    action: Optional[str] = None
):
    query = db.query(UserAudit).options(
        joinedload(UserAudit.target_user),
        joinedload(UserAudit.actor)
    )
    
    if user_id:
        query = query.filter(UserAudit.user_id == user_id)
    if action:
        query = query.filter(UserAudit.action == action)
    
    logs = query.order_by(UserAudit.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for log in logs:
        # Use Pydantic's from_orm but we need to inject emails if they are not properties of UserAudit
        # UserAudit has relationships to User, so we can access log.target_user.email
        log_data = schemas.AuditLogOut.from_orm(log)
        if log.target_user:
            log_data.target_user_email = log.target_user.email
        if log.actor:
            log_data.actor_email = log.actor.email
        result.append(log_data)
        
    return result

@router.post("/cleanup")
def cleanup_logs(
    days: int = Query(30, description="Delete logs older than these days"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(check_super_admin)
):
    # Use naive UTC to match database storage convention
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    deleted_count = db.query(UserAudit).filter(UserAudit.created_at < cutoff).delete()
    db.commit()
    return {"message": f"Cleaned up {deleted_count} logs older than {days} days"}

@router.get("/health", response_model=schemas.SystemHealth)
def system_health(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(check_super_admin)
):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
        
    return schemas.SystemHealth(
        status="operational" if db_status == "connected" else "degraded",
        database=db_status,
        timestamp=datetime.now(timezone.utc),
        version="1.0.0"
    )

@router.get("/metrics", response_model=schemas.SystemMetrics)
def system_metrics(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(check_super_admin)
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_products = db.query(Product).count()
    total_movements = db.query(Movement).count()
    
    return schemas.SystemMetrics(
        total_users=total_users,
        active_users=active_users,
        total_products=total_products,
        total_movements=total_movements
    )
