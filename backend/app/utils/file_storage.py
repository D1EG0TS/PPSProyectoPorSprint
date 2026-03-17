import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException
import uuid
import os
import mimetypes

# Base directory for absolute paths (backend/)
# Assuming this file is at backend/app/utils/file_storage.py
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
PRODUCTS_DIR = UPLOAD_DIR / "products"
PROFILES_DIR = UPLOAD_DIR / "profiles"

# Ensure directories exist
PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
PROFILES_DIR.mkdir(parents=True, exist_ok=True)

def _normalize_ext_from_mime(content_type: str) -> str:
    if not content_type:
        return ""
    mapping = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    return mapping.get(content_type.lower(), "")

def save_upload_file(upload_file: UploadFile, destination: Path) -> str:
    try:
        # Generate unique filename
        original_ext = os.path.splitext(upload_file.filename or "")[1].lower()
        if original_ext in (".jpeg",):
            original_ext = ".jpg"
        # Fallback to content-type if the original filename has no extension
        if not original_ext:
            original_ext = _normalize_ext_from_mime(getattr(upload_file, "content_type", "") or "")
        # As a final fallback, try to guess from MIME table (rarely needed)
        if not original_ext and upload_file.content_type:
            guessed = mimetypes.guess_extension(upload_file.content_type)
            original_ext = (guessed or "").lower()
        # If still unknown, reject upload to avoid serving octet-stream
        if not original_ext:
            raise HTTPException(status_code=415, detail="Unsupported image type. Allowed: jpg, png, webp, gif")

        unique_filename = f"{uuid.uuid4()}{original_ext}"
        file_path = destination / unique_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
            
        # Return relative path for URL (e.g. uploads/products/uuid.jpg)
        # We want the path relative to BASE_DIR so it works with StaticFiles mount
        relative_path = file_path.relative_to(BASE_DIR)
        return str(relative_path).replace("\\", "/") 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

def save_product_image(file: UploadFile) -> str:
    return save_upload_file(file, PRODUCTS_DIR)

def save_profile_image(file: UploadFile) -> str:
    return save_upload_file(file, PROFILES_DIR)
