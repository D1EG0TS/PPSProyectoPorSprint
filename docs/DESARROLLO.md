# Guía de Desarrollo - EXPROOF Inventory Management

## Tabla de Contenidos
1. [Resumen del Proyecto](#resumen-del-proyecto)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Configuración del Entorno](#configuración-del-entorno)
5. [Ejecución](#ejecución)
6. [Sistema de Permisos](#sistema-de-permisos)
7. [Flujo de Trabajo Git](#flujo-de-trabajo-git)
8. [Sprints Implementados](#sprints-implementados)

---

## Resumen del Proyecto

**EXPROOF** es un sistema de gestión de inventario con módulos de:
- Escaneo de productos (SKU, código de barras)
- Recepción de mercancía
- Ajustes de inventario
- Transferencias entre almacenes/ubicaciones
- (Futuro) Conteo cíclico, reportes, mapa visual, impresión de etiquetas, proveedores

---

## Stack Tecnológico

### Backend
| Componente | Tecnología |
|------------|------------|
| Framework | FastAPI |
| ORM | SQLAlchemy |
| Base de datos | MySQL |
| Autenticación | JWT (python-jose) |
| Servidor | Uvicorn / Gunicorn |

### Frontend
| Componente | Tecnología |
|------------|------------|
| Framework | React Native (Expo) |
| Routing | expo-router |
| UI | react-native-paper |
| HTTP | axios |
| Testing | jest + testing-library |

---

## Estructura del Proyecto

```
PPSProyectoPorSprint/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── inventory.py    # Endpoints de inventario (Sprints 1-3)
│   │   │   │   ├── products.py
│   │   │   │   ├── movements.py
│   │   │   │   └── ...
│   │   │   ├── auth.py
│   │   │   └── deps.py            # Dependencias (autenticación, DB)
│   │   ├── schemas/
│   │   │   └── inventory.py       # Schemas Pydantic
│   │   ├── models/                # Modelos SQLAlchemy
│   │   ├── crud/                  # Operaciones de base de datos
│   │   ├── services/              # Lógica de negocio
│   │   │   └── stock_service.py   # Servicio de stock
│   │   └── db/
│   │       ├── seed_database.py   # Datos iniciales
│   │       └── database.py
│   ├── tests/                     # Pruebas unitarias
│   ├── main.py                    # Entry point
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   │   └── inventory/     # Gestión de inventario
│   │   │   ├── operator/
│   │   │   │   ├── scan/         # Escaneo
│   │   │   │   ├── receive/      # Recepción
│   │   │   │   └── transfer/     # Transferencias
│   │   │   └── moderator/
│   │   ├── (auth)/               # Rutas de autenticación
│   │   └── (visitor)/            # Rutas públicas
│   ├── components/
│   │   └── inventory/
│   │       ├── BarcodeScanner.tsx
│   │       ├── AdjustmentModal.tsx
│   │       └── TransferModal.tsx
│   ├── services/
│   │   └── inventoryService.ts    # API de inventario
│   ├── types/
│   ├── constants/
│   ├── package.json
│   └── jest.config.js
└── docs/
    ├── DESARROLLO.md              # Esta guía
    └── API_INVENTARIO.md          # Documentación de API
```

---

## Configuración del Entorno

### Prerrequisitos

1. **Python 3.10+** (backend)
2. **Node.js 18+** (frontend)
3. **MySQL 8.0+** (base de datos)
4. **Git**

### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar base de datos MySQL
# Crear base de datos:
mysql -u root -p -e "CREATE DATABASE exproof_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Configurar variables de entorno (crear .env)
cat > .env << EOF
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/exproof_db
SECRET_KEY=your-secret-key-here
EOF

# Poblar base de datos con datos iniciales
python -m app.db.seed_database
```

### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno (crear app.json o .env)
```

---

## Ejecución

### Backend

```bash
cd backend
source venv/bin/activate

# Modo desarrollo
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Modo producción
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

**Endpoints principales:**
- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend

```bash
cd frontend

# Desarrollo (web)
npm start

# Desarrollo (Android)
npm run android

# Desarrollo (iOS)
npm run ios

# Pruebas
npm test
```

---

## Sistema de Permisos

### Roles

| ID | Nombre | Nivel |
|----|--------|-------|
| 1 | Super Admin | 1 |
| 2 | Admin | 2 |
| 3 | User/Moderator | 3 |
| 4 | Manager | 2 |
| 5 | Guest/Visitor | 3 |

### Permisos de Inventario

| Permiso | Descripción | Roles |
|---------|-------------|-------|
| `inventory:receive` | Recibir mercancía | 1-3 |
| `inventory:adjust` | Ajustar inventario | 1-3 |
| `inventory:transfer` | Transferir productos | 1-4 |
| `inventory:view` | Ver inventario | 1-2 |

### Agregar Permisos

Los permisos se agregan en `backend/app/db/seed_database.py`:

```python
# Agregar en la sección de permisos
permission = Permission(
    code="inventory:transfer",
    name="Transfer Inventory",
    module="inventory"
)
db.add(permission)
db.commit()
```

---

## Flujo de Trabajo Git

### Ramas por Sprint

```bash
# Rama principal
git checkout main

# Crear rama para sprint
git checkout -b feature/sprint-3-transferencias

# Trabajar, hacer commits
git add .
git commit -m "feat: agregar endpoint de transferencia"

# Hacer merge cuando esté listo
git checkout main
git merge feature/sprint-3-transferencias
```

### Commits Convencionales

```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
test: pruebas
refactor: refactorización
chore: tareas de mantenimiento
```

---

## Sprints Implementados

### Sprint 1: Escáner + Recepción de Mercancía ✅

**Backend:**
- `POST /inventory/scan` - Buscar producto por SKU, barcode o código de ubicación
- `POST /inventory/receive` - Recibir mercancía
- `GET /inventory/warehouses` - Listar almacenes
- `GET /inventory/locations/available` - Ubicaciones disponibles

**Frontend:**
- `BarcodeScanner.tsx` - Componente de escaneo
- `/operator/scan` - Pantalla de escaneo
- `/operator/receive` - Pantalla de recepción

---

### Sprint 2: Ajustes de Inventario ✅

**Backend:**
- `POST /inventory/adjust` - Crear ajuste de inventario
- `GET /inventory/adjustments` - Historial de ajustes

**Razones de Ajuste:**
- `RECOUNT` - Conteo
- `DAMAGE` - Dañado
- `THEFT` - Robo
- `EXPIRED` - Vencido
- `CORRECTION` - Corrección
- `OTHER` - Otro

**Frontend:**
- `AdjustmentModal.tsx` - Modal de ajustes
- Integración en `/admin/inventory`

---

### Sprint 3: Transferencias entre Ubicaciones ✅

**Backend:**
- `POST /inventory/transfer` - Transferir productos entre almacenes
- `GET /inventory/transfers` - Historial de transferencias

**Frontend:**
- `TransferModal.tsx` - Modal de transferencia
- `/operator/transfer` - Pantalla de transferencia

---

### Sprint 4: Conteo Cíclico ✅

**Backend:**
- `POST /inventory/cycle-count` - Crear sesión de conteo
- `GET /inventory/cycle-count` - Listar sesiones
- `GET /inventory/cycle-count/{count_id}` - Detalle con items
- `POST /inventory/cycle-count/{count_id}/record` - Registrar conteo
- `POST /inventory/cycle-count/{count_id}/complete` - Completar sesión
- `POST /inventory/cycle-count/{count_id}/approve-variances` - Aprobar varianzas

**Frontend:**
- `/operator/cycle-count/index.tsx` - Lista de conteos
- `/operator/cycle-count/create/index.tsx` - Crear conteo
- `/operator/cycle-count/[id]/index.tsx` - Detalle de conteo

---

### Sprint 5: Reportes de Caducidad y Stock Bajo ✅

**Backend:**
- `GET /inventory/reports/expiring` - Productos próximos a vencer
- `GET /inventory/reports/low-stock` - Productos con stock bajo
- `GET /inventory/reports/summary` - Resumen de inventario

**Frontend:**
- `/admin/reports/index.tsx` - Dashboard de reportes
- `/admin/reports/expiring.tsx` - Productos por vencer
- `/admin/reports/low-stock.tsx` - Stock bajo
- `/admin/reports/summary.tsx` - Resumen de inventario

---

## Sprint 6: Mapa Visual del Almacén (Editor Visual) ✅

**Backend:**
- `models/warehouse_layout.py` - Modelos WarehouseLayout y LayoutCell
- `schemas/warehouse_layout.py` - Schemas Pydantic
- `crud/warehouse_layout.py` - CRUD operations
- `endpoints/warehouse_layout.py` - API endpoints
- `tests/test_warehouse_layout.py` - Tests unitarios

**Endpoints:**
- `GET /inventory/layout/` - Listar layouts
- `POST /inventory/layout/` - Crear layout
- `GET /inventory/layout/{id}` - Obtener layout con celdas
- `PUT /inventory/layout/{id}` - Actualizar layout
- `DELETE /inventory/layout/{id}` - Eliminar layout
- `GET /inventory/layout/warehouse/{warehouse_id}` - Layout por almacén
- `POST /inventory/layout/{id}/cells` - Crear celda
- `PUT /inventory/layout/{id}/cells/{cell_id}` - Actualizar celda
- `POST /inventory/layout/{id}/generate` - Generar grid vacío
- `GET /inventory/layout/{id}/heatmap` - Datos de ocupación
- `GET /inventory/layout/{id}/export` - Exportar JSON
- `POST /inventory/layout/import` - Importar JSON

**Frontend:**
- `warehouseLayoutService.ts` - Servicio API
- `WarehouseMap.tsx` - Componente de visualización
- `MapEditor.tsx` - Componente de edición visual
- `CellDetailModal.tsx` - Modal de detalle
- `/admin/warehouse-map/index.tsx` - Vista del mapa
- `/admin/warehouse-map/editor/index.tsx` - Editor de mapa

**Funcionalidades:**
- Visualización 2D del almacén con grid
- Editor visual para crear/editar celdas
- Tipos de celdas: zona, pasillo, estante, almacenamiento, recepción, envío, preparación
- Heatmap de ocupación
- Zoom y pan en el mapa
- Import/Export JSON
- Vinculación con ubicaciones

**Tests:**
- `backend/tests/test_warehouse_layout.py` - Tests del backend
- `frontend/services/__tests__/warehouseLayoutService.test.ts` - Tests del frontend

---

## Sprint 7: Sistema de Etiquetas (Generación PDF) ✅

**Backend:**
- `models/label.py` - Modelo LabelTemplate
- `schemas/label.py` - Schemas de etiquetas
- `services/barcode_generator.py` - Generación de códigos QR, Code128, EAN-13
- `services/pdf_generator.py` - Generación de PDFs con ReportLab
- `endpoints/labels.py` - API endpoints
- `tests/test_labels.py` - Tests unitarios
- `requirements.txt` - Dependencias agregadas: reportlab, python-barcode, qrcode, Pillow

**Endpoints:**
- `GET /inventory/labels/templates` - Listar plantillas
- `POST /inventory/labels/templates` - Crear plantilla
- `GET /inventory/labels/templates/{id}` - Obtener plantilla
- `PUT /inventory/labels/templates/{id}` - Actualizar plantilla
- `DELETE /inventory/labels/templates/{id}` - Eliminar plantilla
- `GET /inventory/labels/product/{id}` - Generar etiqueta de producto (PDF)
- `GET /inventory/labels/location/{id}` - Generar etiqueta de ubicación (PDF)
- `POST /inventory/labels/generate` - Generar etiqueta personalizada (PDF)
- `POST /inventory/labels/batch-print` - Impresión por lote

**Frontend:**
- `services/labelService.ts` - Servicio API
- `components/labels/LabelPreview.tsx` - Componente de preview
- `/operator/labels/index.tsx` - Pantalla de generación de etiquetas
- Dependencias: expo-print, expo-sharing

**Funcionalidades:**
- Generación de códigos QR, Code128, Code39, EAN-13
- Plantillas predefinidas (pequeña, mediana, grande)
- Preview de etiqueta antes de imprimir
- Exportar a PDF para imprimir
- Compartir etiqueta
- Historial de plantillas

**Tipos de código:**
- QR Code - Productos, ubicaciones
- Code128 - Productos, assets
- EAN-13 - Productos con UPC
- Code39 - Ubicaciones

**Tests:**
- `backend/tests/test_labels.py` - Tests del backend
- `frontend/services/__tests__/labelService.test.ts` - Tests del frontend

---

## Sprint 8: Módulo de Proveedores + Notificaciones ✅

**Backend:**
- `models/supplier.py` - Modelo Supplier con estados y categorías
- `models/purchase_order.py` - Modelo PurchaseOrder con workflow completo
- `models/notification_preferences.py` - Modelo UserNotificationPreference
- `schemas/supplier.py` - Schemas de proveedor
- `schemas/purchase_order.py` - Schemas de orden de compra
- `schemas/notification_preferences.py` - Schemas de preferencias
- `endpoints/suppliers.py` - API de proveedores
- `endpoints/purchase_orders.py` - API de órdenes de compra
- `endpoints/notifications.py` - Endpoints de preferencias y tokens push
- `services/email_service.py` - Servicio de email con SendGrid
- `services/push_notification_service.py` - Servicio Expo Push
- `tests/test_suppliers.py` - Tests unitarios
- `requirements.txt` - Dependencia: sendgrid

**Endpoints Proveedores:**
- `GET /suppliers/` - Listar proveedores (con filtros)
- `POST /suppliers/` - Crear proveedor
- `GET /suppliers/{id}` - Obtener proveedor
- `PUT /suppliers/{id}` - Actualizar proveedor
- `DELETE /suppliers/{id}` - Desactivar proveedor
- `GET /suppliers/stats/overview` - Estadísticas

**Endpoints Órdenes de Compra:**
- `GET /purchase-orders/` - Listar órdenes
- `POST /purchase-orders/` - Crear orden
- `GET /purchase-orders/{id}` - Obtener orden
- `PUT /purchase-orders/{id}` - Actualizar orden
- `POST /purchase-orders/{id}/submit` - Enviar orden
- `POST /purchase-orders/{id}/approve` - Aprobar orden
- `POST /purchase-orders/{id}/reject` - Rechazar orden
- `POST /purchase-orders/{id}/send` - Enviar a proveedor
- `POST /purchase-orders/{id}/receive` - Marcar como recibida
- `POST /purchase-orders/{id}/cancel` - Cancelar orden
- `GET /purchase-orders/stats/overview` - Estadísticas

**Endpoints Notificaciones:**
- `GET /notifications/preferences` - Obtener preferencias
- `PUT /notifications/preferences` - Actualizar preferencias
- `POST /notifications/register-push-token` - Registrar token
- `DELETE /notifications/unregister-push-token` - Eliminar token

**Estados de Orden de Compra:**
- `draft` - Borrador
- `pending_approval` - Pendiente aprobación
- `approved` - Aprobada
- `sent` - Enviada
- `confirmed` - Confirmada por proveedor
- `in_progress` - En progreso
- `partially_received` - Parcialmente recibida
- `received` - Recibida completamente
- `cancelled` - Cancelada
- `rejected` - Rechazada

**Categorías de Proveedor:**
- `raw_materials` - Materias primas
- `finished_goods` - Productos terminados
- `equipment` - Equipo
- `services` - Servicios
- `packaging` - Empaque
- `other` - Otro

**Servicios de Notificación:**
- Email con SendGrid (HTML templates)
- Push con Expo Push
- Preferencias por usuario y evento

**Frontend:**
- `services/supplierService.ts` - Servicio de proveedores
- `services/purchaseOrderService.ts` - Servicio de órdenes
- `services/notificationPreferencesService.ts` - Servicio de preferencias
- `app/(dashboard)/admin/suppliers/index.tsx` - Lista de proveedores
- `app/(dashboard)/admin/purchase-orders/index.tsx` - Lista de órdenes
- `config/navigation.ts` - Menú actualizado

**Tests:**
- `backend/tests/test_suppliers.py` - Tests del backend
- `frontend/services/__tests__/supplierService.test.ts` - Tests de proveedores
- `frontend/services/__tests__/purchaseOrderService.test.ts` - Tests de órdenes

**Dependencias Frontend:**
- expo-notifications

---

## Sprint 9: Correcciones Críticas + Condiciones de Producto ✅

**Objetivo:** Corregir bugs críticos y agregar soporte para condiciones de producto

**Backend:**
- `models/product.py` - Agregado `condition_id` (nullable)
- `models/inventory_refs.py` - Agregado `is_active` a Condition
- `crud/product.py` - CRUD completo de condiciones, `delete_batch`
- `schemas/product.py` - `ProductBatchUpdate` con fechas, `condition_id`
- `schemas/inventory_refs.py` - Schemas de Condition (CRUD)
- `endpoints/products.py`:
  - `GET/POST /products/conditions/` - Listar/Crear condiciones (roles 1,2)
  - `PUT/DELETE /products/conditions/{id}` - Actualizar/Eliminar condición
  - `PUT /products/batches/{id}` - Actualizar lote con fechas
  - `DELETE /products/batches/{id}` - Eliminar lote
  - Validación: expiration_date requerido si `has_expiration=True`

**Endpoints Nuevos:**
```
GET    /products/conditions/           - Listar condiciones
POST   /products/conditions/           - Crear condición
PUT    /products/conditions/{id}       - Actualizar condición
DELETE /products/conditions/{id}        - Eliminar condición (soft delete)
PUT    /products/batches/{id}         - Actualizar lote (incluye fechas)
DELETE /products/batches/{id}         - Eliminar lote
```

**Frontend:**
- `services/productService.ts`:
  - Exportado `getProductBatches` (faltaba)
  - Agregado `updateProductBatch`, `deleteProductBatch`
  - CRUD de condiciones (`getConditions`, `createCondition`, `updateCondition`, `deleteCondition`)
- `app/(dashboard)/admin/products/[id]/edit.tsx`:
  - Agregados campos `brand` y `model` (faltan en edit)
  - Agregado selector de condición (opcional)
  - Modal de batch permite editar fechas
  - Botón eliminar lote
- `components/products/BatchTable.tsx`:
  - Agregado botón de eliminar lote
  - Columnas en español

**Validaciones:**
- Si `has_expiration=True`, `expiration_date` es requerido al crear batch
- Solo admins (rol 1,2) pueden gestionar condiciones
- No se puede eliminar lote con quantity > 0

**Tests:**
- `backend/tests/test_products_sprint9.py` - Tests de condiciones y batches
- `frontend/services/__tests__/productServiceSprint9.test.ts` - 10 tests passing

---

## Troubleshooting

### Error de conexión a MySQL
```
 sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) 
 Connection refused
```
**Solución:** Verificar que MySQL esté corriendo y las credenciales sean correctas.

### Error de permisos en SQLite (testing)
```
sqlite3.OperationalError: attempt to write a readonly database
```
**Solución:** Verificar permisos de escritura en el directorio de tests.

### Error de CORS
```
Access-Control-Allow-Origin missing
```
**Solución:** Configurar CORS en `backend/main.py`.

---

## Contacto y Soporte

Para soporte técnico o dudas sobre el desarrollo, consultar la documentación de API en `docs/API_INVENTARIO.md` o contactar al equipo de desarrollo.
