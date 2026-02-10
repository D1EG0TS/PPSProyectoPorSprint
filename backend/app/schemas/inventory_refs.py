from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None

class Category(CategoryBase):
    id: int
    subcategories: List['Category'] = []
    model_config = ConfigDict(from_attributes=True)

class UnitBase(BaseModel):
    name: str
    abbreviation: str

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    name: Optional[str] = None
    abbreviation: Optional[str] = None

class Unit(UnitBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
