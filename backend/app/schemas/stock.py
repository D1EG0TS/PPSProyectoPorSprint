from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class LedgerEntryType(str, Enum):
    INCREMENT = "increment"
    DECREMENT = "decrement"

class StockResponse(BaseModel):
    product_id: int
    quantity: int
    warehouse_id: Optional[int] = None
    location_id: Optional[int] = None

class StockValidationRequest(BaseModel):
    product_id: int
    warehouse_id: int
    location_id: Optional[int] = None
    quantity: int

class LedgerEntryResponse(BaseModel):
    id: int
    movement_request_id: int
    product_id: int
    warehouse_id: int
    location_id: Optional[int]
    entry_type: LedgerEntryType
    quantity: int
    previous_balance: int
    new_balance: int
    applied_at: datetime
    applied_by: int
    
    model_config = ConfigDict(from_attributes=True)
