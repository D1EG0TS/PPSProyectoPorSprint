from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, Float, Date, Numeric
from sqlalchemy.orm import relationship
from app.models.user import Base
import datetime

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    barcode = Column(String(100), index=True, nullable=True)
    name = Column(String(200), index=True, nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    cost = Column(Numeric(10, 2), default=0.0)
    price = Column(Numeric(10, 2), default=0.0)
    min_stock = Column(Integer, default=0)
    target_stock = Column(Integer, default=0)
    has_batch = Column(Boolean, default=False)
    has_expiration = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    category = relationship("Category", backref="products")
    unit = relationship("Unit", backref="products")
    batches = relationship("ProductBatch", back_populates="product", cascade="all, delete-orphan")

class ProductBatch(Base):
    __tablename__ = "product_batches"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_number = Column(String(100), nullable=False)
    manufactured_date = Column(Date, nullable=True)
    expiration_date = Column(Date, nullable=True)
    quantity = Column(Integer, default=0)

    # Relationships
    product = relationship("Product", back_populates="batches")
