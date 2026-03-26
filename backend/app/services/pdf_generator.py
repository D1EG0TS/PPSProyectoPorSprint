import io
import os
import time
from typing import List, Optional, Dict, Any
from io import BytesIO
from PIL import Image
from reportlab.lib.pagesizes import mm
from reportlab.lib.units import mm as mm_unit
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.platypus import Image as RLImage
from reportlab.lib import colors

from app.services.barcode_generator import BarcodeGenerator


class PDFLabelGenerator:
    def __init__(self, width_mm: float = 50, height_mm: float = 25):
        self.width_mm = width_mm
        self.height_mm = height_mm
        self.width_pt = width_mm * mm_unit
        self.height_pt = height_mm * mm_unit

    def _get_barcode_data(self, data: Dict[str, Any], include_barcode: bool, include_sku: bool, include_location: bool) -> str:
        if include_barcode and data.get('barcode'):
            return data['barcode']
        if include_sku and data.get('sku'):
            return data['sku']
        if include_location and data.get('location_code'):
            return data['location_code']
        if data.get('product_name'):
            return data['product_name'][:20]
        return 'NO-DATA'

    def generate_single_label(
        self,
        data: Dict[str, Any],
        label_type: str = 'qr',
        qr_size: int = 100,
        barcode_height: int = 30,
        font_name: str = 'Helvetica',
        font_size: int = 8,
        show_border: bool = True,
        border_width: int = 1,
        background_color: str = '#FFFFFF',
        text_color: str = '#000000',
        include_product_name: bool = True,
        include_sku: bool = True,
        include_barcode: bool = True,
        include_location: bool = False,
        include_batch: bool = False,
        include_expiration: bool = False
    ) -> bytes:
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(self.width_pt, self.height_pt))
        
        c.setFillColor(HexColor(background_color))
        c.rect(0, 0, self.width_pt, self.height_pt, fill=True, stroke=False)
        
        if show_border:
            c.setStrokeColor(HexColor(text_color))
            c.setLineWidth(border_width)
            c.rect(0, 0, self.width_pt, self.height_pt, fill=False, stroke=True)
        
        c.setFillColor(HexColor(text_color))
        
        y_offset = self.height_pt - 5 * mm_unit
        x_margin = 2 * mm_unit
        content_width = self.width_pt - 2 * x_margin
        
        barcode_data = self._get_barcode_data(data, include_barcode, include_sku, include_location)
        
        try:
            barcode_image = BarcodeGenerator.generate(
                barcode_data,
                label_type=label_type,
                size=qr_size,
                height=barcode_height
            )
            
            barcode_buffer = BytesIO(barcode_image)
            barcode_img = Image.open(barcode_buffer)
            
            img_width_pt = min(content_width * 0.5, self.height_pt * 0.8)
            img_height_pt = img_width_pt * (barcode_img.height / barcode_img.width)
            
            img_x = (self.width_pt - img_width_pt) / 2
            img_y = self.height_pt - img_height_pt - 5 * mm_unit
            
            c.drawImage(
                RLImage(barcode_buffer),
                img_x, img_y,
                width=img_width_pt,
                height=img_height_pt
            )
            
            y_offset = img_y - 2 * mm_unit
        except Exception as e:
            pass
        
        if include_product_name and data.get('product_name'):
            c.setFont(font_name, font_size)
            product_name = data['product_name'][:25]
            c.drawString(x_margin, y_offset, product_name)
            y_offset -= font_size + 2
        
        if include_sku and data.get('sku'):
            c.setFont(font_name, font_size - 1)
            c.drawString(x_margin, y_offset, f"SKU: {data['sku'][:20]}")
            y_offset -= font_size
        
        if include_location and data.get('location_code'):
            c.setFont(font_name, font_size - 1)
            c.drawString(x_margin, y_offset, f"Loc: {data['location_code']}")
            y_offset -= font_size
        
        if include_batch and data.get('batch_number'):
            c.setFont(font_name, font_size - 1)
            c.drawString(x_margin, y_offset, f"Lote: {data['batch_number'][:15]}")
            y_offset -= font_size
        
        if include_expiration and data.get('expiration_date'):
            c.setFont(font_name, font_size - 1)
            c.drawString(x_margin, y_offset, f"Exp: {data['expiration_date']}")
        
        c.save()
        buffer.seek(0)
        return buffer.getvalue()

    def generate_batch_labels(
        self,
        items: List[Dict[str, Any]],
        label_type: str = 'qr',
        copies_per_label: int = 1,
        **kwargs
    ) -> bytes:
        labels_per_row = int(210 * mm_unit / self.width_pt)
        if labels_per_row < 1:
            labels_per_row = 1
        
        label_width = 210 * mm_unit / labels_per_row
        label_height = self.height_pt
        
        rows_per_page = int(297 * mm_unit / label_height)
        if rows_per_page < 1:
            rows_per_page = 1
        
        total_labels = len(items) * copies_per_label
        labels_per_page = labels_per_row * rows_per_page
        
        from reportlab.lib.pagesizes import letter
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        current_label = 0
        page_num = 0
        
        while current_label < total_labels:
            if current_label > 0 and current_label % labels_per_page == 0:
                c.showPage()
                page_num += 1
            
            page_offset = current_label % labels_per_page
            row = page_offset // labels_per_row
            col = page_offset % labels_per_row
            
            item_index = current_label // copies_per_label
            if item_index < len(items):
                item = items[item_index]
                
                x = col * label_width + (label_width - self.width_pt) / 2
                y = 297 * mm_unit - (row + 1) * label_height - 10 * mm_unit
                
                c.saveState()
                c.translate(x, y)
                
                label_buffer = BytesIO(self.generate_single_label(item, label_type, **kwargs))
                c.drawImage(
                    RLImage(label_buffer),
                    0, 0,
                    width=self.width_pt,
                    height=self.height_pt
                )
                
                c.restoreState()
            
            current_label += 1
        
        c.save()
        buffer.seek(0)
        return buffer.getvalue()


def generate_label_pdf(
    data: Dict[str, Any],
    label_type: str = 'qr',
    width_mm: float = 50,
    height_mm: float = 25,
    **kwargs
) -> bytes:
    generator = PDFLabelGenerator(width_mm=width_mm, height_mm=height_mm)
    return generator.generate_single_label(data, label_type, **kwargs)


def generate_batch_labels_pdf(
    items: List[Dict[str, Any]],
    label_type: str = 'qr',
    width_mm: float = 50,
    height_mm: float = 25,
    copies_per_label: int = 1,
    **kwargs
) -> bytes:
    generator = PDFLabelGenerator(width_mm=width_mm, height_mm=height_mm)
    return generator.generate_batch_labels(items, label_type, copies_per_label, **kwargs)
