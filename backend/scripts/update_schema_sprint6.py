import pymysql
import os
import sys

# Database config - Try to read from env or use defaults
DB_HOST = "localhost"
DB_USER = "root"
DB_PASS = ""
DB_NAME = "appexproof"

print("Connecting to database...")
try:
    connection = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )
    
    print("Connected successfully.")
    
    with connection.cursor() as cursor:
        # 1. Add columns if they don't exist
        columns_to_add = ["aisle", "rack", "shelf", "position"]
        
        # Check existing columns
        cursor.execute(f"SHOW COLUMNS FROM storage_locations")
        existing_columns = [row['Field'] for row in cursor.fetchall()]
        
        for col in columns_to_add:
            if col not in existing_columns:
                print(f"Adding column {col}...")
                cursor.execute(f"ALTER TABLE storage_locations ADD COLUMN {col} VARCHAR(50) NULL")
            else:
                print(f"Column {col} already exists.")

        # 2. Update ENUM
        # Note: We need to check if the enum values are already there or we might get an error or it's just idempotent
        print("Updating location_type ENUM to include 'zone' and 'aisle'...")
        try:
            cursor.execute("ALTER TABLE storage_locations MODIFY COLUMN location_type ENUM('zone', 'aisle', 'rack', 'shelf', 'bin', 'pallet', 'floor') NOT NULL DEFAULT 'shelf'")
            print("ENUM updated.")
        except Exception as e:
            print(f"Error updating ENUM (might be already up to date): {e}")
        
    connection.commit()
    print("\nSchema updated successfully!")
    print("You can now assign locations using explicit coordinates (Aisle, Rack, Shelf, Position).")
    
except ImportError:
    print("Error: pymysql module not found. Please run 'pip install pymysql' in your backend environment.")
except Exception as e:
    print(f"Error connecting or updating database: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
