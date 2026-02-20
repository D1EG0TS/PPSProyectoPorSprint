from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User, Role
from app.schemas.assets import (
    AssetCategory, AssetCategoryCreate, AssetCategoryUpdate,
    Asset, AssetCreate, AssetUpdate,
    AssetMaintenance, AssetMaintenanceCreate, AssetMaintenanceUpdate,
    AssetCalibration, AssetCalibrationCreate, AssetCalibrationUpdate,
    AssetAssignment, AssetAssignmentCreate, AssetAssignmentUpdate,
    AssetType, MaintenanceType, MaintenanceStatus, CalibrationStatus, AssignmentStatus, AssetAction
)
from app.services.asset_service import AssetService, MaintenanceService, CalibrationService
from app.services.asset_report_service import AssetReportService
from app.models.assets import AssetCategory as AssetCategoryModel, Asset as AssetModel
from app.models.assets import AssetAttribute, AssetMaintenance as AssetMaintenanceModel, AssetCalibration as AssetCalibrationModel, AssetAssignment as AssetAssignmentModel

router = APIRouter()

@router.post("/run-daily-checks", dependencies=[Depends(deps.get_current_active_superuser)])
def run_daily_checks(db: Session = Depends(deps.get_db)):
    """
    Ejecuta manualmente las verificaciones diarias (Calibración, Garantía, etc.)
    """
    count = AssetService.run_daily_checks(db)
    return {"message": f"Daily checks completed. {count} alerts generated."}

@router.get("/reports/calibration", dependencies=[Depends(deps.get_current_active_user)])
def get_calibration_report(db: Session = Depends(deps.get_db)):
    return AssetReportService.get_calibration_status_report(db)

@router.get("/reports/maintenance", dependencies=[Depends(deps.get_current_active_user)])
def get_maintenance_report(asset_id: Optional[int] = None, db: Session = Depends(deps.get_db)):
    return AssetReportService.get_maintenance_report(db, asset_id)

@router.get("/reports/valuation", dependencies=[Depends(deps.get_current_active_superuser)])
def get_valuation_report(db: Session = Depends(deps.get_db)):
    return AssetReportService.get_valuation_report(db)

@router.get("/reports/utilization", dependencies=[Depends(deps.get_current_active_superuser)])
def get_utilization_report(db: Session = Depends(deps.get_db)):
    return AssetReportService.get_utilization_report(db)

@router.get("/dashboard/widgets", dependencies=[Depends(deps.get_current_active_user)])
def get_dashboard_widgets(db: Session = Depends(deps.get_db)):
    return AssetReportService.get_dashboard_widgets(db)

# Categories
@router.get("/categories", response_model=List[AssetCategory])
def list_categories(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(AssetCategoryModel).all()

@router.post("/categories", response_model=AssetCategory)
def create_category(
    category_in: AssetCategoryCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser)
):
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if db.query(AssetCategoryModel).filter(AssetCategoryModel.code == category_in.code).first():
        raise HTTPException(status_code=400, detail="Category code already exists")
        
    db_obj = AssetCategoryModel(**category_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/categories/types", response_model=List[str])
def list_category_types(
    current_user: User = Depends(deps.get_current_active_user)
):
    return [t.value for t in AssetType]

@router.get("/categories/{id}", response_model=AssetCategory)
def get_category(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    cat = db.query(AssetCategoryModel).filter(AssetCategoryModel.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat

@router.put("/categories/{id}", response_model=AssetCategory)
def update_category(
    id: int,
    category_in: AssetCategoryUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser)
):
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    cat = db.query(AssetCategoryModel).filter(AssetCategoryModel.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    for field, value in category_in.dict(exclude_unset=True).items():
        setattr(cat, field, value)
        
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{id}")
def delete_category(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser)
):
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    cat = db.query(AssetCategoryModel).filter(AssetCategoryModel.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    if cat.assets:
        raise HTTPException(status_code=400, detail="Category is in use by assets")
        
    db.delete(cat)
    db.commit()
    return {"message": "Category deleted"}

# Assets
@router.get("/", response_model=List[Asset])
def list_assets(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    type: Optional[AssetType] = None,
    status: Optional[str] = None,
    location_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(deps.get_current_active_user)
):
    query = db.query(AssetModel)
    
    if type:
        query = query.join(AssetCategoryModel).filter(AssetCategoryModel.asset_type == type)
    if status:
        query = query.filter(AssetModel.status == status)
    if location_id:
        query = query.filter(AssetModel.location_id == location_id)
    if search:
        query = query.filter(
            (AssetModel.asset_tag.ilike(f"%{search}%")) |
            (AssetModel.name.ilike(f"%{search}%")) |
            (AssetModel.serial_number.ilike(f"%{search}%")) |
            (AssetModel.model.ilike(f"%{search}%"))
        )
        
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=Asset)
def create_asset(
    asset_in: AssetCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return AssetService.create_asset(db, asset_in, current_user.id)

@router.get("/search", response_model=List[Asset])
def search_assets(
    q: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(AssetModel).filter(
        (AssetModel.asset_tag.ilike(f"%{q}%")) |
        (AssetModel.name.ilike(f"%{q}%")) |
        (AssetModel.serial_number.ilike(f"%{q}%")) |
        (AssetModel.model.ilike(f"%{q}%"))
    ).all()

@router.get("/{id}", response_model=Asset)
def get_asset(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    asset = db.query(AssetModel).filter(AssetModel.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.put("/{id}", response_model=Asset)
def update_asset(
    id: int,
    asset_in: AssetUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    asset = AssetService.update_asset(db, id, asset_in, current_user.id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.post("/{id}/depreciate")
def calculate_depreciation(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    depreciation = AssetService.calculate_depreciation(db, id)
    if not depreciation:
        raise HTTPException(status_code=400, detail="Depreciation not applicable or already up to date")
    return depreciation

# Type specific helpers
@router.get("/tools", response_model=List[Asset])
def list_tools(db: Session = Depends(deps.get_db)):
    return db.query(AssetModel).join(AssetCategoryModel).filter(AssetCategoryModel.asset_type == AssetType.HERRAMIENTA).all()

@router.get("/measuring", response_model=List[Asset])
def list_measuring(db: Session = Depends(deps.get_db)):
    return db.query(AssetModel).join(AssetCategoryModel).filter(AssetCategoryModel.asset_type == AssetType.EQUIPO_MEDICION).all()

@router.get("/computers", response_model=List[Asset])
def list_computers(db: Session = Depends(deps.get_db)):
    return db.query(AssetModel).join(AssetCategoryModel).filter(AssetCategoryModel.asset_type == AssetType.ACTIVO_INFORMATICO).all()

# Maintenance
@router.get("/{id}/maintenance", response_model=List[AssetMaintenance])
def get_asset_maintenance(
    id: int,
    db: Session = Depends(deps.get_db)
):
    return db.query(AssetMaintenanceModel).filter(AssetMaintenanceModel.asset_id == id).all()

@router.post("/{id}/maintenance", response_model=AssetMaintenance)
def create_maintenance(
    id: int,
    maintenance_in: AssetMaintenanceCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if maintenance_in.asset_id != id:
        raise HTTPException(status_code=400, detail="Asset ID mismatch")
    return MaintenanceService.schedule_maintenance(db, maintenance_in, current_user.id)

# Calibration
@router.get("/{id}/calibration-history", response_model=List[AssetCalibration])
def get_calibration_history(
    id: int,
    db: Session = Depends(deps.get_db)
):
    return db.query(AssetCalibrationModel).filter(AssetCalibrationModel.asset_id == id).all()

@router.post("/{id}/calibrate", response_model=AssetCalibration)
def record_calibration(
    id: int,
    calibration_in: AssetCalibrationCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if calibration_in.asset_id != id:
        raise HTTPException(status_code=400, detail="Asset ID mismatch")
    return CalibrationService.schedule_calibration(db, calibration_in, current_user.id)

@router.get("/calibration/due", response_model=List[AssetCalibration])
def get_calibration_due(
    days: int = 30,
    db: Session = Depends(deps.get_db)
):
    target_date = date.today() + timedelta(days=days)
    return db.query(AssetCalibrationModel).filter(
        AssetCalibrationModel.status == CalibrationStatus.VIGENTE,
        AssetCalibrationModel.expiration_date <= target_date
    ).all()

# Assignments
@router.get("/{id}/assignments", response_model=List[AssetAssignment])
def get_assignments(
    id: int,
    db: Session = Depends(deps.get_db)
):
    return db.query(AssetAssignmentModel).filter(AssetAssignmentModel.asset_id == id).all()

@router.post("/{id}/assign", response_model=AssetAssignment)
def assign_asset(
    id: int,
    assignment_in: AssetAssignmentCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    asset = db.query(AssetModel).filter(AssetModel.id == id).first()
    if not asset or asset.status.value != "disponible":
        raise HTTPException(status_code=400, detail="Asset not available")
        
    assignment = AssetAssignmentModel(
        **assignment_in.dict(),
        assigned_by=current_user.id,
        assignment_date=datetime.now(),
        status=AssignmentStatus.ACTIVA
    )
    db.add(assignment)
    
    asset.status = "asignado"
    asset.responsible_user_id = assignment_in.assigned_to
    
    AssetService.log_action(db, id, AssetAction.ASIGNADO, user_id=current_user.id, new_val=assignment_in.dict())
    
    db.commit()
    db.refresh(assignment)
    return assignment

@router.post("/{id}/return", response_model=AssetAssignment)
def return_asset(
    id: int,
    condition_in: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    assignment = db.query(AssetAssignmentModel).filter(
        AssetAssignmentModel.asset_id == id,
        AssetAssignmentModel.status == AssignmentStatus.ACTIVA
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=400, detail="No active assignment found")
        
    assignment.return_date = datetime.now()
    assignment.status = AssignmentStatus.DEVUELTA
    assignment.condition_in = condition_in
    
    asset = db.query(AssetModel).filter(AssetModel.id == id).first()
    asset.status = "disponible"
    asset.responsible_user_id = None
    
    AssetService.log_action(db, id, AssetAction.DEVUELTO, user_id=current_user.id)
    
    db.commit()
    db.refresh(assignment)
    return assignment
