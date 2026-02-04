from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_db_connection():
    try:
        # Try to connect
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            print("✅ Conexión a la base de datos exitosa.")
    except Exception as e:
        print(f"❌ Error al conectar a la base de datos: {e}")

