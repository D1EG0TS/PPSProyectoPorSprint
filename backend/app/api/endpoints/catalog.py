from typing import List, Union, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.services.catalog_service import CatalogService
from app.schemas import catalog_schemas
from app.models.user import User

router = APIRouter()

@router.get("/public", response_model=List[catalog_schemas.PublicCatalogItem])
def get_public_catalog(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(deps.get_db)
):
    """
    Get public catalog (Role 5 / Guest).
    No authentication required.
    """
    service = CatalogService(db)
    # Role 5 is Guest
    return service.get_catalog_for_role(role_id=5, skip=skip, limit=limit, search=search)

@router.get("/operational", response_model=List[catalog_schemas.OperationalCatalogItem])
def get_operational_catalog(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get operational catalog (Role 4).
    """
    if current_user.role_id > 4:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    service = CatalogService(db)
    return service.get_catalog_for_role(role_id=4, skip=skip, limit=limit, search=search)

@router.get("/internal", response_model=List[Union[catalog_schemas.AdminCatalogItem, catalog_schemas.InternalCatalogItem]])
def get_internal_catalog(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get internal catalog (Role 1-3).
    Returns AdminCatalogItem for Role 1-2, InternalCatalogItem for Role 3.
    """
    if current_user.role_id > 3:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    service = CatalogService(db)
    # Pass actual user role to get correct data level
    return service.get_catalog_for_role(role_id=current_user.role_id, skip=skip, limit=limit, search=search)

@router.get("/search", response_model=List[Union[catalog_schemas.AdminCatalogItem, catalog_schemas.InternalCatalogItem, catalog_schemas.OperationalCatalogItem, catalog_schemas.PublicCatalogItem]])
def search_catalog(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
):
    """
    Unified search that automatically filters by role.
    If not authenticated, returns public catalog.
    """
    role_id = 5 # Default to Guest
    if current_user:
        role_id = current_user.role_id
        
    service = CatalogService(db)
    return service.get_catalog_for_role(role_id=role_id, skip=skip, limit=limit, search=q)

@router.get("/permissions", response_model=dict)
def get_my_catalog_permissions(
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get catalog permissions for current user.
    """
    return deps.get_catalog_permissions(current_user.role_id)
