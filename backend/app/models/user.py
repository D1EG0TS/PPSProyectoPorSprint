from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone
import json

Base = declarative_base()

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    level = Column(Integer, default=1)

    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    permissions_version = Column(Integer, default=1)

    role = relationship("Role", back_populates="users")
    sessions = relationship("Session", back_populates="user")
    # Audit logs where this user is the target
    audit_logs = relationship("UserAudit", foreign_keys="UserAudit.user_id", back_populates="target_user")
    # Audit logs where this user is the actor
    actions_performed = relationship("UserAudit", foreign_keys="UserAudit.changed_by", back_populates="actor")

class UserAudit(Base):
    __tablename__ = "user_audits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Target user
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True) # Actor
    action = Column(String(50), nullable=False) # CREATE, UPDATE, DELETE, RESET_PASSWORD
    details = Column(Text, nullable=True) # JSON string of changes
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    target_user = relationship("User", foreign_keys=[user_id], back_populates="audit_logs")
    actor = relationship("User", foreign_keys=[changed_by], back_populates="actions_performed")
