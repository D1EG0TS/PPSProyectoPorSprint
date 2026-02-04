from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.connection import test_db_connection
from app.api.endpoints.system import router as system_router
from app.api.auth import router as auth_router
from app.api.endpoints.products import router as products_router
from app.api.endpoints.warehouses import router as warehouses_router
from app.api.endpoints.movements import router as movements_router
from app.api.endpoints.tools import router as tools_router
from app.api.endpoints.epp import router as epp_router
from app.api.endpoints.vehicles import router as vehicles_router
from app.api.endpoints.reports import router as reports_router
from app.api.endpoints.users import router as users_router
from app.core.config import settings
from app.core.middleware import ActiveSessionMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Iniciando aplicación...")
    test_db_connection()
    yield

app = FastAPI(title="Sistema de Inventario API", lifespan=lifespan)

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

app.include_router(system_router, prefix="/system", tags=["System"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(products_router, prefix="/products", tags=["Products"])
app.include_router(warehouses_router, prefix="/warehouses", tags=["Warehouses"])
app.include_router(movements_router, prefix="/movements", tags=["Movements"])
app.include_router(tools_router, prefix="/tools", tags=["Tools"])
app.include_router(epp_router, prefix="/epp", tags=["EPP"])
app.include_router(vehicles_router, prefix="/vehicles", tags=["Vehicles"])
app.include_router(reports_router, prefix="/reports", tags=["Reports"])
app.include_router(users_router, prefix="/users", tags=["Users"])

@app.get("/")
def read_root():
    return {"message": "Sistema de Inventario API funcionando"}
