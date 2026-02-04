from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import declarative_base

# Reutilizamos Base si ya está importada en otro lugar, pero para mantener coherencia en este archivo
# asumiremos que se importará desde un módulo común o se usará la misma instancia.
# Para evitar duplicidad de metadata, importamos Base de app.models.user si es posible.
# Sin embargo, para evitar importaciones circulares, lo ideal es tener Base en un archivo separado (app/db/base_class.py).
# Por ahora, usaremos la Base importada en app.models.__init__.py si es posible, o definimos aquí si no conflictua.

from app.models.user import Base

class Condition(Base):
    __tablename__ = "conditions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)

class Unit(Base):
    __tablename__ = "units"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    abbreviation = Column(String(10), unique=True, nullable=False)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
