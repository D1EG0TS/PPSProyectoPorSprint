from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
from app.db.connection import test_db_connection
from app.db.schema_bootstrap import ensure_schema
from app.api.endpoints.system import router as system_router
from app.api.auth import router as auth_router
from app.api.endpoints.products import router as products_router
from app.api.endpoints.warehouses import router as warehouses_router
from app.api.endpoints.movements import router as movements_router
from app.api.endpoints.tools import router as tools_router
from app.api.endpoints.epp import router as epp_router
from app.api.endpoints.vehicles import router as vehicles_router
from app.api.endpoints.vehicle_maintenance import router as vehicle_maintenance_router
from app.api.endpoints.reports import router as reports_router
from app.api.endpoints.purchase import router as purchase_router
from app.api.endpoints.notifications import router as notifications_router
from app.api.endpoints.users import router as users_router
from app.api.endpoints.permissions import router as permissions_router
from app.api.endpoints.locations import router as locations_router
from app.api.endpoints.catalog import router as catalog_router
from app.api.endpoints.stock import router as stock_router
from app.api.endpoints.websockets import router as websockets_router
from app.api.endpoints.integrated_requests import router as integrated_requests_router
from app.api.endpoints.tracking import router as tracking_router
from app.api.endpoints.assets import router as assets_router
from app.core.config import settings
from app.core.middleware import ActiveSessionMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Iniciando aplicación...")
    test_db_connection()
    ensure_schema()
    yield

app = FastAPI(title="Sistema de Inventario API", lifespan=lifespan)

# Mount uploads directory for static file access
uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

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

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(products_router, prefix="/products", tags=["Products"])
app.include_router(warehouses_router, prefix="/warehouses", tags=["Warehouses"])
app.include_router(locations_router, prefix="/locations", tags=["Locations"])
app.include_router(movements_router, prefix="/movements", tags=["Movements"])
app.include_router(tools_router, prefix="/tools", tags=["Tools"])
app.include_router(epp_router, prefix="/epp", tags=["EPP"])
app.include_router(vehicles_router, prefix="/vehicles", tags=["Vehicles"])
app.include_router(vehicle_maintenance_router, prefix="/vehicles/maintenance", tags=["Vehicle Maintenance"])
app.include_router(permissions_router, prefix="/permissions", tags=["Permissions"])
app.include_router(catalog_router, prefix="/catalog", tags=["Catalog"])
app.include_router(websockets_router, tags=["WebSockets"])
app.include_router(system_router, prefix="/system", tags=["System"])
app.include_router(integrated_requests_router, prefix="/requests/integrated", tags=["Integrated Requests"])
app.include_router(stock_router, prefix="/stock", tags=["Stock"])
app.include_router(tracking_router, prefix="/tracking", tags=["Tracking"])
app.include_router(assets_router, prefix="/assets", tags=["Assets"])
app.include_router(reports_router, prefix="/reports", tags=["Reports"])
app.include_router(purchase_router, prefix="/purchase", tags=["Purchase Alerts"])
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])

@app.get("/")
def read_root():
    return {"message": "Sistema de Inventario API funcionando"}
