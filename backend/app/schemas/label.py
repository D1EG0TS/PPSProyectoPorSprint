from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from enum import Enum


class LabelType(str, Enum):
    QR = "qr"
    CODE128 = "code128"
    CODE39 = "code39"
    EAN13 = "ean13"


class LabelSize(str, Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class LabelTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    label_type: LabelType = LabelType.QR
    size: LabelSize = LabelSize.MEDIUM
    width_mm: float = 50
    height_mm: float = 25
    include_product_name: bool = True
    include_sku: bool = True
    include_barcode: bool = True
    include_location: bool = False
    include_batch: bool = False
    include_expiration: bool = False
    qr_size: int = 100
    barcode_height: int = 30
    font_name: str = "Helvetica"
    font_size: int = 8
    show_border: bool = True
    border_width: int = 1
    background_color: str = "#FFFFFF"
    text_color: str = "#000000"


class LabelTemplateCreate(LabelTemplateBase):
    pass


class LabelTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    label_type: Optional[LabelType] = None
    size: Optional[LabelSize] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    include_product_name: Optional[bool] = None
    include_sku: Optional[bool] = None
    include_barcode: Optional[bool] = None
    include_location: Optional[bool] = None
    include_batch: Optional[bool] = None
    include_expiration: Optional[bool] = None
    qr_size: Optional[int] = None
    barcode_height: Optional[int] = None
    font_name: Optional[str] = None
    font_size: Optional[int] = None
    show_border: Optional[bool] = None
    border_width: Optional[int] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class LabelTemplateResponse(LabelTemplateBase):
    id: int
    is_active: bool
    is_default: bool
    created_by: int
    updated_by: Optional[int] = None
    created_at: int
    updated_at: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class LabelData(BaseModel):
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    location_code: Optional[str] = None
    location_name: Optional[str] = None
    batch_number: Optional[str] = None
    expiration_date: Optional[str] = None
    custom_text: Optional[str] = None


class GenerateLabelRequest(BaseModel):
    data: LabelData
    template_id: Optional[int] = None
    label_type: Optional[LabelType] = None


class BatchLabelRequest(BaseModel):
    items: List[LabelData]
    template_id: Optional[int] = None
    label_type: Optional[LabelType] = None
    copies_per_label: int = 1


class LabelPrintResponse(BaseModel):
    success: bool
    file_path: str
    file_name: str
    label_count: int
    message: str
