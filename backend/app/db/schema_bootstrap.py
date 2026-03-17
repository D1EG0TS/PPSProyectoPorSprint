from sqlalchemy import create_engine, text

from app.core.config import settings


def ensure_schema() -> None:
    engine = create_engine(str(settings.DATABASE_URL))
    statements = [
        "ALTER TABLE storage_locations ADD COLUMN aisle VARCHAR(50) NULL;",
        "ALTER TABLE storage_locations ADD COLUMN rack VARCHAR(50) NULL;",
        "ALTER TABLE storage_locations ADD COLUMN shelf VARCHAR(50) NULL;",
        "ALTER TABLE storage_locations ADD COLUMN `position` VARCHAR(50) NULL;",
        "ALTER TABLE storage_locations ADD COLUMN location_type VARCHAR(20) NOT NULL DEFAULT 'shelf';",
        "ALTER TABLE storage_locations ADD COLUMN capacity INT DEFAULT 0;",
        "ALTER TABLE storage_locations ADD COLUMN dimensions JSON NULL;",
        "ALTER TABLE storage_locations ADD COLUMN temperature_zone VARCHAR(50) NULL;",
        "ALTER TABLE storage_locations ADD COLUMN is_restricted TINYINT(1) DEFAULT 0;",
        "ALTER TABLE storage_locations ADD COLUMN current_occupancy INT DEFAULT 0;",
        "ALTER TABLE storage_locations ADD COLUMN barcode VARCHAR(100) NULL;",
        "CREATE UNIQUE INDEX ix_storage_locations_barcode ON storage_locations(barcode);",
        "ALTER TABLE movement_request_items ADD COLUMN source_location_id INT NULL;",
        "ALTER TABLE movement_request_items ADD COLUMN destination_location_id INT NULL;",
        "CREATE INDEX ix_movement_request_items_source_location_id ON movement_request_items(source_location_id);",
        "CREATE INDEX ix_movement_request_items_destination_location_id ON movement_request_items(destination_location_id);",
    ]
    with engine.connect() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass
        conn.commit()
