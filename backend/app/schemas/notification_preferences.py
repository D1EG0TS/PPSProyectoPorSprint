from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class NotificationChannel(str, Enum):
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"
    SMS = "sms"


class NotificationEvent(str, Enum):
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


class NotificationPreferenceBase(BaseModel):
    email_enabled: bool = True
    push_enabled: bool = True
    in_app_enabled: bool = True
    sms_enabled: bool = False
    
    purchase_order_created: bool = True
    purchase_order_approved: bool = True
    purchase_order_rejected: bool = True
    purchase_order_sent: bool = True
    purchase_order_confirmed: bool = True
    purchase_order_received: bool = True
    purchase_order_cancelled: bool = False
    
    low_stock_alert: bool = True
    expiration_warning: bool = True
    payment_due_reminder: bool = True
    
    email_frequency: str = "immediate"


class NotificationPreferenceCreate(NotificationPreferenceBase):
    pass


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    
    purchase_order_created: Optional[bool] = None
    purchase_order_approved: Optional[bool] = None
    purchase_order_rejected: Optional[bool] = None
    purchase_order_sent: Optional[bool] = None
    purchase_order_confirmed: Optional[bool] = None
    purchase_order_received: Optional[bool] = None
    purchase_order_cancelled: Optional[bool] = None
    
    low_stock_alert: Optional[bool] = None
    expiration_warning: Optional[bool] = None
    payment_due_reminder: Optional[bool] = None
    
    email_frequency: Optional[str] = None


class NotificationPreferenceResponse(NotificationPreferenceBase):
    id: int
    user_id: int
    created_at: int
    updated_at: Optional[int] = None
    
    class Config:
        from_attributes = True


class PushTokenRegister(BaseModel):
    token: str
    platform: str = "expo"
    device_id: Optional[str] = None


class PushTokenResponse(BaseModel):
    success: bool
    message: str
