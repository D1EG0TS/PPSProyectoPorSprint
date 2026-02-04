import sys
import os
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.connection import SessionLocal
from app.models.session import Session

def cleanup_expired_sessions():
    """
    Remove expired sessions from the database.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        deleted_count = db.query(Session).filter(Session.expires_at < now).delete()
        db.commit()
        print(f"[{now}] Cleaned up {deleted_count} expired sessions.")
    except Exception as e:
        print(f"Error cleaning up sessions: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_expired_sessions()
