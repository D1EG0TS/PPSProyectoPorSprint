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

## Próximos Sprints (Planificados)

| Sprint | Módulo | Descripción |
|--------|--------|-------------|
| 6 | Mapa Visual | Layout 2D del almacén, heatmap de ocupación |
| 7 | Etiquetas | Generación QR/código, preview e impresión |
| 8 | Proveedores | CRUD proveedores, órdenes de compra |

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
