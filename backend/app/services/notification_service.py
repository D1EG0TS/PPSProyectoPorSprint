from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional
from app.models.notification import Notification, NotificationType
from app.models.user import User

class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        type: NotificationType = NotificationType.INFO,
        related_request_id: Optional[int] = None
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            related_request_id=related_request_id
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        query = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)
        return query.order_by(Notification.created_at.desc()).limit(limit).all()

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> Optional[Notification]:
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notification:
            notification.is_read = True
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({Notification.is_read: True})
        db.commit()
        return count

    @staticmethod
    def has_notification_today(
        db: Session,
        user_id: int,
        type: NotificationType,
        related_request_id: Optional[int] = None,
        title_contains: Optional[str] = None
    ) -> bool:
        today = datetime.now().date()
        query = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.type == type,
            func.date(Notification.created_at) == today
        )
        if related_request_id:
            query = query.filter(Notification.related_request_id == related_request_id)
        if title_contains:
            query = query.filter(Notification.title.contains(title_contains))
            
        return db.query(query.exists()).scalar()
