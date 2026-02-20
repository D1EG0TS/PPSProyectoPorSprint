import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.api import deps
from app.services.catalog_service import CatalogService
from app.models.user import User

# Setup DB connection
# Assuming the app uses the default DB URL from env or config
# We'll try to use the one from main app logic or just create a session if we can mock the request
# But easier to just import the session getter if possible, or setup manually.

# Add backend to path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal

def test_catalog_error():
    db = SessionLocal()
    try:
        service = CatalogService(db)
        print("Testing Operational Catalog (Role 4)...")
        # Role 4 = Operational
        items = service.get_catalog_for_role(role_id=4)
        print(f"Success! Found {len(items)} items.")
        
        print("Testing Internal Catalog (Role 3)...")
        # Role 3 = Internal
        items = service.get_catalog_for_role(role_id=3)
        print(f"Success! Found {len(items)} items.")
        
    except Exception as e:
        print(f"CAUGHT EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_catalog_error()
