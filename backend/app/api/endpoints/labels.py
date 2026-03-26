import os
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.api import deps
from app.models.user import User
from app.models.label import LabelTemplate, LabelSize
from app.models.product import Product
from app.models.location_models import StorageLocation
from app.schemas.label import (
    LabelTemplateCreate, LabelTemplateUpdate, LabelTemplateResponse,
    GenerateLabelRequest, BatchLabelRequest, LabelData
)
from app.services.pdf_generator import generate_label_pdf, generate_batch_labels_pdf
import time as time_module

router = APIRouter()

LABELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "labels")


def get_default_template() -> dict:
    return {
        'width_mm': 50,
        'height_mm': 25,
        'qr_size': 100,
        'barcode_height': 30,
        'font_name': 'Helvetica',
        'font_size': 8,
        'show_border': True,
        'border_width': 1,
        'background_color': '#FFFFFF',
        'text_color': '#000000',
        'include_product_name': True,
        'include_sku': True,
        'include_barcode': True,
        'include_location': False,
        'include_batch': False,
        'include_expiration': False,
    }


def template_to_dict(template: LabelTemplate) -> dict:
    return {
        'width_mm': template.width_mm,
        'height_mm': template.height_mm,
        'qr_size': template.qr_size,
        'barcode_height': template.barcode_height,
        'font_name': template.font_name,
        'font_size': template.font_size,
        'show_border': template.show_border,
        'border_width': template.border_width,
        'background_color': template.background_color,
        'text_color': template.text_color,
        'include_product_name': template.include_product_name,
        'include_sku': template.include_sku,
        'include_barcode': template.include_barcode,
        'include_location': template.include_location,
        'include_batch': template.include_batch,
        'include_expiration': template.include_expiration,
    }


@router.get("/templates", response_model=List[LabelTemplateResponse])
def list_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    templates = db.query(LabelTemplate).offset(skip).limit(limit).all()
    return templates


@router.post("/templates", response_model=LabelTemplateResponse, status_code=201)
def create_template(
    template_in: LabelTemplateCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    template = LabelTemplate(
        **template_in.model_dump(),
        created_by=current_user.id,
        created_at=int(time_module.time())
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/templates/{template_id}", response_model=LabelTemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    template = db.query(LabelTemplate).filter(LabelTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/templates/{template_id}", response_model=LabelTemplateResponse)
def update_template(
    template_id: int,
    template_in: LabelTemplateUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2]))
):
    template = db.query(LabelTemplate).filter(LabelTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = template_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    template.updated_by = current_user.id
    template.updated_at = int(time_module.time())
    
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1]))
):
    template = db.query(LabelTemplate).filter(LabelTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"success": True, "message": "Template deleted"}


@router.get("/product/{product_id}")
def generate_product_label(
    product_id: int,
    template_id: Optional[int] = Query(None),
    label_type: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    template = None
    if template_id:
        template = db.query(LabelTemplate).filter(LabelTemplate.id == template_id).first()
    
    settings = template_to_dict(template) if template else get_default_template()
    
    if label_type:
        settings['label_type'] = label_type
    else:
        settings['label_type'] = template.label_type.value if template else 'qr'
    
    data = {
        'product_id': product.id,
        'product_name': product.name,
        'sku': product.sku,
        'barcode': product.barcode,
    }
    
    pdf_content = generate_label_pdf(data, **settings)
    
    filename = f"label_product_{product.sku}_{int(time_module.time())}.pdf"
    
    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.get("/location/{location_id}")
def generate_location_label(
    location_id: int,
    template_id: Optional[int] = Query(None),
    label_type: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    location = db.query(StorageLocation).filter(StorageLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    template = None
    if template_id:
        template = db.query(LabelTemplate).filter(LabelTemplate.id == template_id).first()
    
    settings = template_to_dict(template) if template else get_default_template()
    
    if label_type:
        settings['label_type'] = label_type
    else:
        settings['label_type'] = 'code128'
    
    data = {
        'product_name': location.name,
        'sku': location.code,
        'barcode': location.barcode or location.code,
        'location_code': location.code,
        'location_name': location.name,
    }
    
    pdf_content = generate_label_pdf(data, **settings)
    
    filename = f"label_location_{location.code}_{int(time_module.time())}.pdf"
    
    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.post("/generate")
def generate_custom_label(
    request: GenerateLabelRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    template = None
    if request.template_id:
        template = db.query(LabelTemplate).filter(LabelTemplate.id == request.template_id).first()
    
    settings = template_to_dict(template) if template else get_default_template()
    
    if request.label_type:
        settings['label_type'] = request.label_type.value if hasattr(request.label_type, 'value') else request.label_type
    else:
        settings['label_type'] = template.label_type.value if template else 'qr'
    
    data = request.data.model_dump()
    
    pdf_content = generate_label_pdf(data, **settings)
    
    filename = f"label_{int(time_module.time())}.pdf"
    
    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@router.post("/batch-print")
def batch_print_labels(
    request: BatchLabelRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_roles([1, 2, 3]))
):
    template = None
    if request.template_id:
        template = db.query(LabelTemplate).filter(LabelTemplate.id == request.template_id).first()
    
    settings = template_to_dict(template) if template else get_default_template()
    
    if request.label_type:
        settings['label_type'] = request.label_type.value if hasattr(request.label_type, 'value') else request.label_type
    else:
        settings['label_type'] = template.label_type.value if template else 'qr'
    
    items_data = [item.model_dump() for item in request.items]
    
    pdf_content = generate_batch_labels_pdf(
        items_data,
        copies_per_label=request.copies_per_label,
        **settings
    )
    
    label_count = len(items_data) * request.copies_per_label
    filename = f"labels_batch_{int(time_module.time())}.pdf"
    
    return {
        "success": True,
        "filename": filename,
        "label_count": label_count,
        "pdf": pdf_content.hex() if False else None,
    }
