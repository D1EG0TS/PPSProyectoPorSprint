from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.api import deps
from app.core import security
from app.models.user import User, UserAudit, Role
from app.schemas import user as schemas
import json

router = APIRouter()

def log_audit(db: Session, user_id: int, action: str, changed_by: int, details: dict = None):
    audit = UserAudit(
        user_id=user_id,
        action=action,
        changed_by=changed_by,
        details=json.dumps(details) if details else None
    )
    db.add(audit)
    # Don't commit here, let the caller commit to ensure atomicity

@router.get("/", response_model=List[schemas.UserResponse])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve users. Only for Roles 1 (Super Admin) and 2 (Admin).
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    query = db.query(User)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_filter),
                User.full_name.ilike(search_filter)
            )
        )
    
    if role_id:
        query = query.filter(User.role_id == role_id)

    # RBAC: Role 2 cannot see Role 1
    if current_user.role_id == 2:
        query = query.filter(User.role_id != 1)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=schemas.UserResponse)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new user.
    Role 2 cannot assign Role 1.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # RBAC: Role 2 cannot create Role 1
    if current_user.role_id == 2 and user_in.role_id == 1:
        raise HTTPException(status_code=403, detail="Admins cannot create Super Admins")

    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system",
        )

    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=security.get_password_hash(user_in.password),
        role_id=user_in.role_id,
        is_active=user_in.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, user.id, "CREATE", current_user.id, details=user_in.model_dump(exclude={"password"}))
    db.commit()

    return user

@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    user_in: schemas.UserUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a user.
    Role 2 cannot modify Super Admin (Role 1).
    Role 2 cannot promote anyone to Role 1.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # RBAC: Role 2 cannot modify Role 1
    if current_user.role_id == 2 and user.role_id == 1:
        raise HTTPException(status_code=403, detail="Admins cannot modify Super Admins")

    # RBAC: Role 2 cannot promote to Role 1
    if current_user.role_id == 2 and user_in.role_id == 1:
        raise HTTPException(status_code=403, detail="Admins cannot promote users to Super Admin")

    update_data = user_in.model_dump(exclude_unset=True)
    
    if "password" in update_data and update_data["password"]:
        hashed_password = security.get_password_hash(update_data["password"])
        del update_data["password"]
        user.password_hash = hashed_password

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, user.id, "UPDATE", current_user.id, details=update_data)
    db.commit()

    return user

@router.delete("/{user_id}", response_model=schemas.UserResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Soft delete a user (set is_active=False).
    Role 2 cannot delete Role 1.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # RBAC: Role 2 cannot delete Role 1
    if current_user.role_id == 2 and user.role_id == 1:
        raise HTTPException(status_code=403, detail="Admins cannot delete Super Admins")

    user.is_active = False
    db.add(user)
    
    # Also revoke all active sessions
    # Implementation depends on session model access, skipping for now as per "soft delete" scope
    
    db.commit()
    db.refresh(user)

    log_audit(db, user.id, "DELETE (SOFT)", current_user.id)
    db.commit()

    return user

@router.post("/{user_id}/reset-password", response_model=schemas.UserResponse)
def reset_password(
    user_id: int,
    password_in: schemas.UserResetPassword,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Reset user password.
    Role 2 cannot reset Role 1's password.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # RBAC: Role 2 cannot reset Role 1
    if current_user.role_id == 2 and user.role_id == 1:
        raise HTTPException(status_code=403, detail="Admins cannot reset Super Admin passwords")

    user.password_hash = security.get_password_hash(password_in.new_password)
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, user.id, "RESET_PASSWORD", current_user.id)
    db.commit()

    return user

@router.get("/{user_id}/audit", response_model=List[schemas.UserAuditResponse])
def read_user_audit(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get audit logs for a user.
    """
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    audits = db.query(UserAudit).filter(UserAudit.user_id == user_id).order_by(UserAudit.created_at.desc()).all()
    
    # Enrich with actor name
    for audit in audits:
        if audit.changed_by:
            actor = db.query(User).filter(User.id == audit.changed_by).first()
            audit.actor_name = actor.full_name if actor else "Unknown"
        else:
            audit.actor_name = "System"

    return audits
