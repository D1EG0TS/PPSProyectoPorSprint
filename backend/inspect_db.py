from sqlalchemy import create_engine, inspect
from app.core.config import settings

def inspect_db():
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    print("Columns in storage_locations:")
    columns = [c['name'] for c in inspector.get_columns('storage_locations')]
    print(columns)
    
    print("\nIndexes in storage_locations:")
    indexes = [i['name'] for i in inspector.get_indexes('storage_locations')]
    print(indexes)

    # print("\nIndexes in product_location_assignments:")
    # p_indexes = [i['name'] for i in inspector.get_indexes('product_location_assignments')]
    # print(p_indexes)

    # print("\nColumns in movement_request_items:")
    # m_columns = [c['name'] for c in inspector.get_columns('movement_request_items')]
    # print(m_columns)

    # print("\nColumns in vehicles:")
    # v_columns = [c['name'] for c in inspector.get_columns('vehicles')]
    # print(v_columns)

if __name__ == "__main__":
    inspect_db()
