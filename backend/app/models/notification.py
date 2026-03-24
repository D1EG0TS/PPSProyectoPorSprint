from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class NotificationType(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"
    LATE_RETURN = "LATE_RETURN"
    UPCOMING_EXPIRATION = "UPCOMING_EXPIRATION"
    APPROVAL_NEEDED = "APPROVAL_NEEDED"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.INFO)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    related_request_id = Column(Integer, ForeignKey("integrated_requests.id"), nullable=True)

    user = relationship("User", back_populates="notifications")
    related_request = relationship("IntegratedRequest")
