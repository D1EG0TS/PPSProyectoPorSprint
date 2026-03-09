from fastapi import Depends, HTTPException, status
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from app.core import config, security
from app.models.user import User
from app.schemas.auth import TokenPayload
from app.db.connection import SessionLocal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    try:
        payload = security.verify_token(token)
        if payload is None:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = TokenPayload(**payload)
        
        if token_data.type != "access":
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role_id != 1:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user

def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme_optional)
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = security.verify_token(token)
        if payload is None:
            return None
        token_data = TokenPayload(**payload)
        
        if token_data.type != "access":
            return None
            
    except (JWTError, ValidationError):
        return None
        
    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if not user or not user.is_active:
        return None
        
    return user

def check_permission(permission_name: str):
    def _check_permission(current_user: User = Depends(get_current_user)):
        # Super admins (Role 1) and Admins (Role 2) have all permissions by default
        if current_user.role_id in [1, 2]:
            return current_user
        
        # Check if user has the specific permission
        # Note: We assume permissions are loaded eagerly or lazily fetched here
        user_permissions = [p.name for p in current_user.permissions]
        
        if permission_name not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions. Required: {permission_name}"
            )
        return current_user
    return _check_permission

def get_catalog_permissions(role_level: int) -> dict:
    """
    Returns catalog capabilities based on role level.
    """
    perms = {
        "can_see_stock": False,
        "can_see_locations": False,
        "can_see_costs": False,
        "can_add_to_request": False,
        "can_export_data": False
    }
    
    # Logic based on requirements
    # Rol 5: Guest - Public only
    if role_level == 5:
        return perms
        
    # Rol 4: Operational - Stock, Add to request
    if role_level <= 4:
        perms["can_see_stock"] = True
        perms["can_add_to_request"] = True
        
    # Rol 3: Internal - Detailed stock, Locations
    if role_level <= 3:
        perms["can_see_locations"] = True
        
    # Rol 1-2: Admin - Costs, Export
    if role_level <= 2:
        perms["can_see_costs"] = True
        perms["can_export_data"] = True
        
    return perms
