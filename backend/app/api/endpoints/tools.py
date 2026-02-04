from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_db
from app.api import deps
from app.models.tool import Tool, ToolHistory, ToolStatus
from app.models.user import User
from app.schemas import tool as schemas

router = APIRouter()

def check_permissions(user: User):
    if user.role_id not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

def log_tool_history(
    db: Session, 
    tool: Tool, 
    action: str, 
    user: User, 
    notes: str = None, 
    from_status=None, 
    to_status=None,
    from_user_id=None,
    to_user_id=None,
    from_location_id=None,
    to_location_id=None
):
    history = ToolHistory(
        tool_id=tool.id,
        action=action,
        changed_by=user.id,
        notes=notes,
        from_status=from_status,
        to_status=to_status,
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        from_location_id=from_location_id,
        to_location_id=to_location_id
    )
    db.add(history)

@router.get("/", response_model=List[schemas.ToolResponse])
def get_tools(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_permissions(current_user)
    tools = db.query(Tool).offset(skip).limit(limit).all()
    return tools

@router.get("/user/{user_id}", response_model=List[schemas.ToolResponse])
def get_user_tools(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Any user can see their own tools? Or only admins?
    # Prompt says: "Asignar herramienta a usuario -> ver en perfil del usuario."
    # So probably the user can see their own tools.
    if current_user.id != user_id and current_user.role_id not in [1, 2]:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    tools = db.query(Tool).filter(Tool.assigned_to == user_id).all()
    return tools

@router.post("/", response_model=schemas.ToolResponse)
def create_tool(
    tool: schemas.ToolCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_permissions(current_user)
    
    existing = db.query(Tool).filter(Tool.serial_number == tool.serial_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Serial number already exists")
    
    db_tool = Tool(**tool.model_dump())
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    
    log_tool_history(
        db, db_tool, "CREATE", current_user, 
        notes="Initial creation",
        to_status=db_tool.status,
        to_location_id=db_tool.location_id,
        to_user_id=db_tool.assigned_to
    )
    db.commit()
    
    return db_tool

@router.get("/{tool_id}", response_model=schemas.ToolResponse)
def get_tool(
    tool_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_permissions(current_user)
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool

@router.put("/{tool_id}", response_model=schemas.ToolResponse)
def update_tool(
    tool_id: int,
    tool_update: schemas.ToolUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_permissions(current_user)
    db_tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not db_tool:
        raise HTTPException(status_code=404, detail="Tool not found")
        
    update_data = tool_update.model_dump(exclude_unset=True)
    
    # Capture old state for logging (simplified, ideally diff each field)
    # For basic update, we might not log everything or just "UPDATE"
    
    if "serial_number" in update_data and update_data["serial_number"] != db_tool.serial_number:
        existing = db.query(Tool).filter(Tool.serial_number == update_data["serial_number"]).first()
        if existing:
             raise HTTPException(status_code=400, detail="Serial number already exists")

    for key, value in update_data.items():
        setattr(db_tool, key, value)
        
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    
    # Simple log for generic update
    log_tool_history(db, db_tool, "UPDATE", current_user, notes="Generic update")
    db.commit()
    
    return db_tool

@router.delete("/{tool_id}")
def delete_tool(
    tool_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_permissions(current_user)
    db_tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not db_tool:
        raise HTTPException(status_code=404, detail="Tool not found")
        
    db.delete(db_tool)
    db.commit()
    return {"ok": True}

@router.post("/{tool_id}/assign", response_model=schemas.ToolResponse)
def assign_tool(
    tool_id: int,
    assign_req: schemas.ToolAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_permissions(current_user)
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
        
    if tool.status == ToolStatus.LOST:
        raise HTTPException(status_code=400, detail="Cannot assign a LOST tool")

    old_user_id = tool.assigned_to
    old_location_id = tool.location_id
    old_status = tool.status

    tool.assigned_to = assign_req.user_id
    tool.location_id = None # Removed from location when assigned to user? Usually yes.
    tool.status = ToolStatus.ASSIGNED
    
    db.add(tool)
    db.commit()
    db.refresh(tool)
    
    log_tool_history(
        db, tool, "ASSIGN", current_user, 
        notes=assign_req.notes,
        from_user_id=old_user_id,
        to_user_id=tool.assigned_to,
        from_location_id=old_location_id,
        to_location_id=tool.location_id,
        from_status=old_status,
        to_status=tool.status
    )
    db.commit()
    
    return tool

@router.post("/{tool_id}/check-out", response_model=schemas.ToolResponse)
def check_out_tool(
    tool_id: int,
    assign_req: schemas.ToolAssignRequest, # Reusing AssignRequest as it needs user_id
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Check-out is functionally similar to assign in this context
    # unless it implies something else. I'll treat it as ASSIGN but with CHECK_OUT action.
    check_permissions(current_user)
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    if tool.status != ToolStatus.AVAILABLE:
         raise HTTPException(status_code=400, detail="Tool must be AVAILABLE to check-out")

    old_user_id = tool.assigned_to
    old_location_id = tool.location_id
    old_status = tool.status

    tool.assigned_to = assign_req.user_id
    tool.location_id = None
    tool.status = ToolStatus.ASSIGNED
    
    db.add(tool)
    db.commit()
    db.refresh(tool)
    
    log_tool_history(
        db, tool, "CHECK_OUT", current_user, 
        notes=assign_req.notes,
        from_user_id=old_user_id,
        to_user_id=tool.assigned_to,
        from_location_id=old_location_id,
        to_location_id=tool.location_id,
        from_status=old_status,
        to_status=tool.status
    )
    db.commit()
    return tool

@router.post("/{tool_id}/check-in", response_model=schemas.ToolResponse)
def check_in_tool(
    tool_id: int,
    check_in_req: schemas.ToolCheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_permissions(current_user)
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    old_user_id = tool.assigned_to
    old_location_id = tool.location_id
    old_status = tool.status

    tool.assigned_to = None
    tool.location_id = check_in_req.location_id
    tool.status = ToolStatus.AVAILABLE
    
    if check_in_req.condition_id:
        tool.condition_id = check_in_req.condition_id
    
    db.add(tool)
    db.commit()
    db.refresh(tool)
    
    log_tool_history(
        db, tool, "CHECK_IN", current_user, 
        notes=check_in_req.notes,
        from_user_id=old_user_id,
        to_user_id=tool.assigned_to,
        from_location_id=old_location_id,
        to_location_id=tool.location_id,
        from_status=old_status,
        to_status=tool.status
    )
    db.commit()
    return tool

@router.get("/{tool_id}/history", response_model=List[schemas.ToolHistoryResponse])
def get_tool_history(
    tool_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    check_permissions(current_user)
    history = db.query(ToolHistory).filter(ToolHistory.tool_id == tool_id).order_by(ToolHistory.created_at.desc()).all()
    return history
