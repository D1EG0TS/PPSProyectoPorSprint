from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import Permission, User
from app.schemas.user import PermissionResponse, PermissionCreate

router = APIRouter()

@router.get("/", response_model=List[PermissionResponse])
def read_permissions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve all permissions.
    """
    # Usually only admins should see this, but for assigning permissions, 
    # the UI might need to list them. Let's restrict to admins/managers.
    if current_user.role_id not in [1, 2, 3]: 
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    permissions = db.query(Permission).all()
    return permissions

@router.post("/", response_model=PermissionResponse)
def create_permission(
    permission_in: PermissionCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new permission.
    """
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Only Super Admin can create permissions")
        
    permission = db.query(Permission).filter(Permission.name == permission_in.name).first()
    if permission:
        raise HTTPException(status_code=400, detail="Permission already exists")
        
    permission = Permission(
        name=permission_in.name,
        description=permission_in.description,
        module=permission_in.module
    )
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return permission
