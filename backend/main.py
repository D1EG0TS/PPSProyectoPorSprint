from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.connection import test_db_connection
from app.api.system import router as system_router
from app.api.auth import router as auth_router
from app.api.endpoints.products import router as products_router
from app.api.endpoints.warehouses import router as warehouses_router
from app.api.endpoints.movements import router as movements_router
from app.core.config import settings
from app.core.middleware import ActiveSessionMiddleware

app = FastAPI(title="Sistema de Inventario API")

# Configuración CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_middleware(ActiveSessionMiddleware)

@app.on_event("startup")
async def startup_event():
    print("Iniciando aplicación...")
    test_db_connection()

app.include_router(system_router, prefix="/system", tags=["System"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(products_router, prefix="/products", tags=["Products"])
app.include_router(warehouses_router, prefix="/warehouses", tags=["Warehouses"])
app.include_router(movements_router, prefix="/movements", tags=["Movements"])

@app.get("/")
def read_root():
    return {"message": "Sistema de Inventario API funcionando"}
