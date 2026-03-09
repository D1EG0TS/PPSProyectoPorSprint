import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException
import uuid
import os

UPLOAD_DIR = Path("uploads")
PRODUCTS_DIR = UPLOAD_DIR / "products"
PROFILES_DIR = UPLOAD_DIR / "profiles"

# Ensure directories exist
PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
PROFILES_DIR.mkdir(parents=True, exist_ok=True)

def save_upload_file(upload_file: UploadFile, destination: Path) -> str:
    try:
        # Generate unique filename
        file_ext = os.path.splitext(upload_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = destination / unique_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
            
        return str(file_path).replace("\\", "/") # Return forward slash path for URL consistency
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

def save_product_image(file: UploadFile) -> str:
    return save_upload_file(file, PRODUCTS_DIR)

def save_profile_image(file: UploadFile) -> str:
    return save_upload_file(file, PROFILES_DIR)
