import pymysql
import os
import sys

# Database config
DB_HOST = "localhost"
DB_USER = "root"
DB_PASS = ""
DB_NAME = "diegoexproof"

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
        # 1. Create ledger_entries table
        table = "ledger_entries"
        print(f"Checking if table {table} exists...")
        cursor.execute(f"SHOW TABLES LIKE '{table}'")
        if not cursor.fetchone():
            print(f"Creating table {table}...")
            create_query = f"""
            CREATE TABLE {table} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                movement_request_id INT NOT NULL,
                product_id INT NOT NULL,
                batch_id INT NULL,
                warehouse_id INT NOT NULL,
                location_id INT NULL,
                entry_type ENUM('increment', 'decrement') NOT NULL,
                quantity INT NOT NULL,
                previous_balance INT NOT NULL,
                new_balance INT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                applied_by INT NOT NULL,
                
                FOREIGN KEY (movement_request_id) REFERENCES movement_requests(id),
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (batch_id) REFERENCES product_batches(id),
                FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
                FOREIGN KEY (location_id) REFERENCES storage_locations(id),
                FOREIGN KEY (applied_by) REFERENCES users(id)
            )
            """
            cursor.execute(create_query)
            print(f"Table {table} created.")
        else:
            print(f"Table {table} already exists.")

        # 2. Update MovementStatus Enum in movement_requests table
        print("Updating movement_requests status ENUM...")
        # Get current enum definition to see if APPLIED is there is hard, usually just running MODIFY is safe if it's a superset
        # Assuming current enum is 'DRAFT','PENDING','APPROVED','REJECTED','COMPLETED','CANCELLED'
        # We want to add 'APPLIED'
        try:
            cursor.execute("ALTER TABLE movement_requests MODIFY COLUMN status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT'")
            print("ENUM updated successfully.")
        except Exception as e:
            print(f"Error updating ENUM (might be same): {e}")

    connection.commit()
    print("\nDatabase updated successfully!")

except Exception as e:
    print(f"Error updating database: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
