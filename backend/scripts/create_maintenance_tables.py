import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.connection import engine
from app.database import Base
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.vehicle_maintenance import (
    VehicleMaintenanceType,
    VehicleMaintenanceRecord,
    VehicleMaintenanceAttachment,
    VehicleMaintenancePart
)

def init_db():
    print("Creating maintenance tables...")
    try:
        # Create all tables (including User and Vehicle if they don't exist)
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
