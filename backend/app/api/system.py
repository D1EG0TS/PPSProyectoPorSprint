from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.connection import test_db_connection

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok", "message": "System is running"}
