from sqlalchemy import Column, String, Text
from app.models.user import Base

class SystemConfig(Base):
    __tablename__ = "system_config"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
