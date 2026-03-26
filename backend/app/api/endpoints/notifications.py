from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.services.notification_service import NotificationService
from pydantic import BaseModel
from datetime import datetime
import time

from app.models.notification_preferences import UserNotificationPreference
from app.schemas.notification_preferences import (
    NotificationPreferenceCreate, NotificationPreferenceUpdate,
    NotificationPreferenceResponse, PushTokenRegister, PushTokenResponse
)

router = APIRouter()

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime
    related_request_id: int | None = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    unread_only: bool = False,
    limit: int = 50
) -> Any:
    return NotificationService.get_user_notifications(db, current_user.id, unread_only, limit)


@router.post("/{id}/read", response_model=NotificationResponse)
def mark_notification_read(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    notification = NotificationService.mark_as_read(db, id, current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@router.post("/read-all", response_model=int)
def mark_all_read(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    return NotificationService.mark_all_as_read(db, current_user.id)


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    prefs = db.query(UserNotificationPreference).filter(
        UserNotificationPreference.user_id == current_user.id
    ).first()
    
    if not prefs:
        prefs = UserNotificationPreference(
            user_id=current_user.id,
            created_at=int(time.time())
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return prefs


@router.put("/preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(
    prefs_in: NotificationPreferenceUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    prefs = db.query(UserNotificationPreference).filter(
        UserNotificationPreference.user_id == current_user.id
    ).first()
    
    if not prefs:
        prefs = UserNotificationPreference(
            user_id=current_user.id,
            created_at=int(time.time())
        )
        db.add(prefs)
    
    update_data = prefs_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)
    
    prefs.updated_at = int(time.time())
    
    db.commit()
    db.refresh(prefs)
    return prefs


@router.post("/register-push-token", response_model=PushTokenResponse)
async def register_push_token(
    token_data: PushTokenRegister,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
    from app.database import Base
    from sqlalchemy.orm import relationship
    
    class PushToken(Base):
        __tablename__ = "push_tokens"
        
        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
        token = Column(Text, nullable=False, unique=True)
        platform = Column(String(50), default="expo")
        device_id = Column(String(255), nullable=True)
        is_active = Column(Boolean, default=True)
        created_at = Column(Integer, nullable=False)
        updated_at = Column(Integer, nullable=True)
        
        user = relationship("User", lazy="select")
    
    existing = db.query(PushToken).filter(
        PushToken.token == token_data.token
    ).first()
    
    if existing:
        existing.user_id = current_user.id
        existing.platform = token_data.platform
        existing.device_id = token_data.device_id
        existing.is_active = True
        existing.updated_at = int(time.time())
    else:
        new_token = PushToken(
            user_id=current_user.id,
            token=token_data.token,
            platform=token_data.platform,
            device_id=token_data.device_id,
            created_at=int(time.time())
        )
        db.add(new_token)
    
    db.commit()
    
    return {"success": True, "message": "Push token registered successfully"}


@router.delete("/unregister-push-token")
async def unregister_push_token(
    token: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
    from app.database import Base
    from sqlalchemy.orm import relationship
    
    class PushToken(Base):
        __tablename__ = "push_tokens"
        
        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
        token = Column(Text, nullable=False, unique=True)
        platform = Column(String(50), default="expo")
        device_id = Column(String(255), nullable=True)
        is_active = Column(Boolean, default=True)
        created_at = Column(Integer, nullable=False)
        updated_at = Column(Integer, nullable=True)
        
        user = relationship("User", lazy="select")
    
    existing = db.query(PushToken).filter(
        PushToken.token == token,
        PushToken.user_id == current_user.id
    ).first()
    
    if existing:
        existing.is_active = False
        existing.updated_at = int(time.time())
        db.commit()
    
    return {"success": True, "message": "Push token unregistered"}
