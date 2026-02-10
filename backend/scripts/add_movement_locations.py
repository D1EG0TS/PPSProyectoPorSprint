import pymysql
import os
import sys

# Database config
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
        # Add source_location_id and destination_location_id to movement_request_items
        table = "movement_request_items"
        
        # Check existing columns
        cursor.execute(f"SHOW COLUMNS FROM {table}")
        existing_columns = [row['Field'] for row in cursor.fetchall()]

        if "source_location_id" not in existing_columns:
            print(f"Adding source_location_id to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN source_location_id INT NULL")
            cursor.execute(f"ALTER TABLE {table} ADD CONSTRAINT fk_{table}_source_loc FOREIGN KEY (source_location_id) REFERENCES storage_locations(id)")
        else:
            print("source_location_id already exists.")

        if "destination_location_id" not in existing_columns:
            print(f"Adding destination_location_id to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN destination_location_id INT NULL")
            cursor.execute(f"ALTER TABLE {table} ADD CONSTRAINT fk_{table}_dest_loc FOREIGN KEY (destination_location_id) REFERENCES storage_locations(id)")
        else:
            print("destination_location_id already exists.")

    connection.commit()
    print("\nSchema updated successfully!")

except Exception as e:
    print(f"Error updating database: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
