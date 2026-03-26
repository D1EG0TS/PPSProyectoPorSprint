import io
import qrcode
import barcode
from barcode.writer import ImageWriter
from PIL import Image
from typing import Optional


class BarcodeGenerator:
    @staticmethod
    def generate_qr(data: str, size: int = 100) -> bytes:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        img = img.resize((size, size), Image.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generate_code128(data: str, height: int = 60) -> bytes:
        code128 = barcode.get_barcode_class('code128')
        rv = io.BytesIO()
        
        try:
            barcode_obj = code128(data, writer=ImageWriter())
            barcode_obj.write(rv, options={'module_width': 0.2, 'module_height': height / 30, 'font_size': 10})
        except Exception:
            code39 = barcode.get_barcode_class('code39')
            barcode_obj = code39(data, writer=ImageWriter())
            barcode_obj.write(rv, options={'module_width': 0.2, 'module_height': height / 30, 'font_size': 10})
        
        rv.seek(0)
        return rv.getvalue()

    @staticmethod
    def generate_code39(data: str, height: int = 60) -> bytes:
        code39 = barcode.get_barcode_class('code39')
        rv = io.BytesIO()
        
        barcode_obj = code39(data, writer=ImageWriter())
        barcode_obj.write(rv, options={'module_width': 0.2, 'module_height': height / 30, 'font_size': 10})
        
        rv.seek(0)
        return rv.getvalue()

    @staticmethod
    def generate_ean13(data: str, height: int = 60) -> bytes:
        clean_data = ''.join(filter(str.isdigit, data))[:12]
        
        if len(clean_data) < 12:
            clean_data = clean_data.zfill(12)
        elif len(clean_data) > 12:
            clean_data = clean_data[:12]
        
        try:
            ean13 = barcode.get_barcode_class('ean13')
            rv = io.BytesIO()
            
            barcode_obj = ean13(clean_data, writer=ImageWriter())
            barcode_obj.write(rv, options={'module_width': 0.2, 'module_height': height / 30, 'font_size': 10})
            
            rv.seek(0)
            return rv.getvalue()
        except Exception:
            return BarcodeGenerator.generate_code128(clean_data, height)

    @staticmethod
    def generate(data: str, label_type: str = 'qr', size: int = 100, height: int = 60) -> bytes:
        label_type = label_type.lower()
        
        if label_type == 'qr':
            return BarcodeGenerator.generate_qr(data, size)
        elif label_type == 'code128':
            return BarcodeGenerator.generate_code128(data, height)
        elif label_type == 'code39':
            return BarcodeGenerator.generate_code39(data, height)
        elif label_type == 'ean13':
            return BarcodeGenerator.generate_ean13(data, height)
        else:
            return BarcodeGenerator.generate_qr(data, size)
