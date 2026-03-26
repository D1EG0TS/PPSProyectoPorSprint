from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"
    SMS = "sms"


class NotificationEvent(str, enum.Enum):
    PURCHASE_ORDER_CREATED = "purchase_order_created"
    PURCHASE_ORDER_APPROVED = "purchase_order_approved"
    PURCHASE_ORDER_REJECTED = "purchase_order_rejected"
    PURCHASE_ORDER_SENT = "purchase_order_sent"
    PURCHASE_ORDER_CONFIRMED = "purchase_order_confirmed"
    PURCHASE_ORDER_RECEIVED = "purchase_order_received"
    PURCHASE_ORDER_CANCELLED = "purchase_order_cancelled"
    LOW_STOCK_ALERT = "low_stock_alert"
    EXPIRATION_WARNING = "expiration_warning"
    PAYMENT_DUE_REMINDER = "payment_due_reminder"


class UserNotificationPreference(Base):
    __tablename__ = "user_notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    email_enabled = Column(Boolean, default=True)
    push_enabled = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    
    purchase_order_created = Column(Boolean, default=True)
    purchase_order_approved = Column(Boolean, default=True)
    purchase_order_rejected = Column(Boolean, default=True)
    purchase_order_sent = Column(Boolean, default=True)
    purchase_order_confirmed = Column(Boolean, default=True)
    purchase_order_received = Column(Boolean, default=True)
    purchase_order_cancelled = Column(Boolean, default=False)
    
    low_stock_alert = Column(Boolean, default=True)
    expiration_warning = Column(Boolean, default=True)
    payment_due_reminder = Column(Boolean, default=True)
    
    email_frequency = Column(String(20), default="immediate")
    
    created_at = Column(Integer, nullable=False)
    updated_at = Column(Integer, nullable=True)

    user = relationship("User", lazy="select")
