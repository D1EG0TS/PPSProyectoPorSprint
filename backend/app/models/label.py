from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class LabelType(str, enum.Enum):
    QR = "qr"
    CODE128 = "code128"
    CODE39 = "code39"
    EAN13 = "ean13"


class LabelSize(str, enum.Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class LabelTemplate(Base):
    __tablename__ = "label_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    
    label_type = Column(SQLEnum(LabelType, values_callable=lambda x: [e.value for e in x]), default=LabelType.QR, nullable=False)
    size = Column(SQLEnum(LabelSize, values_callable=lambda x: [e.value for e in x]), default=LabelSize.MEDIUM, nullable=False)
    
    width_mm = Column(Float, nullable=False, default=50)
    height_mm = Column(Float, nullable=False, default=25)
    
    include_product_name = Column(Boolean, default=True)
    include_sku = Column(Boolean, default=True)
    include_barcode = Column(Boolean, default=True)
    include_location = Column(Boolean, default=False)
    include_batch = Column(Boolean, default=False)
    include_expiration = Column(Boolean, default=False)
    
    qr_size = Column(Integer, default=100)
    barcode_height = Column(Integer, default=30)
    
    font_name = Column(String(50), default="Helvetica")
    font_size = Column(Integer, default=8)
    
    show_border = Column(Boolean, default=True)
    border_width = Column(Integer, default=1)
    
    background_color = Column(String(7), default="#FFFFFF")
    text_color = Column(String(7), default="#000000")
    
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(Integer, nullable=False)
    updated_at = Column(Integer, nullable=True)

    creator = relationship("User", foreign_keys=[created_by], backref="created_templates")
    updater = relationship("User", foreign_keys=[updated_by], backref="updated_templates")
