from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class Category(CategoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class UnitBase(BaseModel):
    name: str
    abbreviation: str

class Unit(UnitBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
