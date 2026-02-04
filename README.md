# PPSProyectoPorSprint

## Contexto del Desarrollo
Este proyecto consiste en un sistema de gestión de inventarios y almacenes (Warehouse Management System), desarrollado como parte de un proyecto académico iterativo dividido en Sprints. El sistema cuenta con un backend en Python (FastAPI) y un frontend en React Native (Expo).

### Arquitectura
- **Backend**: FastAPI, SQLAlchemy, SQLite (con soporte para migraciones Alembic), Pydantic.
- **Frontend**: React Native (Expo), React Native Paper, Axios, Expo Router.
- **Autenticación**: JWT (Access/Refresh Tokens), RBAC (Role-Based Access Control).

## Sprints Completados

### Sprint 3.2: Sistema Base y Autenticación
- Implementación de componentes UI base (Button, Card, Modal, Toast, Table).
- Configuración de tema global y estilos consistentes.
- API de Autenticación (Login, Register, Refresh Token).
- Manejo de sesiones y seguridad.

### Sprint 4.2: Endpoints de Productos
- CRUD completo de productos.
- Filtrado de datos sensibles según roles (costos ocultos para roles de bajo nivel).
- Pruebas de integración para endpoints de productos.

### Sprint 4.3: Catálogo de Visitantes
- Pantalla de catálogo público para visitantes.
- Tarjetas de producto (ProductCard).
- Filtrado, búsqueda y ordenamiento en backend y frontend.
- Redirección automática para usuarios invitados.

### Sprint 5.1: Modelos de Almacenes
- Modelos de base de datos para Almacenes y Ubicaciones (Jerárquicas).
- Migraciones Alembic.
- Tests de modelos y relaciones.

### Sprint 5.2: Endpoints de Almacenes
- API REST para gestión de almacenes.
- Permisos RBAC para creación y edición.
- Tests de integración de API.

### Sprint 5.3: Pantallas de Gestión de Almacenes
- **Listado**: Vista tabular de almacenes con estado y acciones.
- **Creación/Edición**: Formularios con validación.
- **Gestión de Ubicaciones**: 
  - Vista de árbol (Tree View) recursiva para navegar jerarquías de ubicaciones.
  - Modal para crear y editar ubicaciones (Raíz y Sub-ubicaciones).
  - Validaciones de integridad referencial (no eliminar si tiene hijos).
- **Frontend Service**: Integración completa con API de almacenes.

### Sprint 10.1: Módulo de Herramientas (Backend)
**Estado:** Completado
**Implementación:**
- **Modelo de Herramientas (`Tool`):** Gestión de activos individuales con número de serie único, condición, ubicación y asignación a usuarios.
- **Historial de Herramientas (`ToolHistory`):** Registro de auditoría para cambios de estado, ubicación y asignaciones.
- **Endpoints CRUD:** API completa para gestión de herramientas (crear, leer, actualizar, eliminar).
- **Operaciones Específicas:**
  - Asignación a usuarios (`/assign`).
  - Devolución/Check-in (`/check-in`).
  - Consulta de herramientas por usuario (`/user/{id}`).
- **Validaciones:** Control de números de serie duplicados y validación de estados (AVAILABLE, ASSIGNED, etc.).
- **Tests de Integración:** Pruebas automatizadas para el flujo completo de vida de una herramienta.

## Instalación y Ejecución

### Backend
```bash
cd backnd
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python db/seed_database.py
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```
### Sprint 9.2: Dashboards de Inventario y Kardex (Frontend)

**Estado:** Completado
**Implementación:**
1.  **Dashboard de Inventario (`/inventory`):**
    *   Tabla de stock actual por producto.
    *   Filtro por almacén.
    *   Alerta visual de "Bajo Stock" (basado en `min_stock`).
    *   Integración con endpoint `/warehouses/{id}/stock`.
2.  **Kardex de Producto (`/inventory/[id]`):**
    *   Historial detallado de movimientos (Entradas, Salidas, Transferencias).
    *   Cálculo de saldos (Anterior/Nuevo).
    *   **Exportación CSV:** Funcionalidad compatible con Web y Móvil (usando `expo-file-system` y `expo-sharing`).
3.  **Correcciones Técnicas:**
    *   Resolución de errores de linter y tipos TypeScript.
    *   Configuración correcta de dependencias de Expo (`expo-file-system` legacy imports).

**Archivos Clave:**
*   `frontend/app/(dashboard)/inventory/index.tsx`
*   `frontend/app/(dashboard)/inventory/[id].tsx`
*   `frontend/services/warehouseService.ts`



# **SPRINTS PROGRESIVOS DETALLADOS - Proyecto Sistema de Inventario**

## **SPRINT 0.1 - Configuración Inicial Backend**
**Prompt:** Configura el entorno backend inicial con estructura base y dependencias mínimas. Crea:
1. Virtual environment Python 3.11+ con `venv`
2. `requirements.txt` con: fastapi, uvicorn, sqlalchemy, alembic, pymysql, python-jose[cryptography], passlib[bcrypt], python-multipart, pydantic-settings, email-validator
3. Estructura de carpetas básica según arquitectura
4. `main.py` mínimo con FastAPI app
5. `.env.example` con variables críticas (DATABASE_URL, JWT_SECRET_KEY)
6. `pyproject.toml` con configuraciones de black/isort/flake8
7. Script `setup_backend.sh` para inicialización automática
8. Test básico de conexión a BD (sin modelos aún)

**Pruebas:** Verificar que `uvicorn main:app --reload` inicia sin errores y `/docs` muestra Swagger.

## **SPRINT 0.2 - Configuración Inicial Frontend**
**Prompt:** Configura proyecto Expo con TypeScript y estructura modular. Crea:
1. Proyecto Expo (`npx create-expo-app`) con TypeScript template
2. `package.json` con dependencias: react-native-paper (o NativeBase), axios, async-storage, expo-secure-store, react-hook-form, zod, expo-router
3. Estructura de carpetas según arquitectura (app/, components/, etc.)
4. `tsconfig.json` estricto
5. `.env.example` con EXPO_PUBLIC_API_URL
6. Configuración ESLint/Prettier
7. Script `setup_frontend.sh`
8. Pantalla mínima de prueba con texto

**Pruebas:** Verificar que `npx expo start` inicia app en emulador/web.

## **SPRINT 1.1 - Modelos Base: Usuarios y Roles**
**Prompt:** Crea modelos SQLAlchemy para:
1. Tabla `roles` con campos: id, name, description, level
2. Tabla `users` con campos: id, email, password_hash, full_name, role_id, is_active, created_at, updated_at, permissions_version
3. Relación User ↔ Role (many-to-one)
4. Pydantic schemas para: UserCreate, UserUpdate, UserResponse, RoleResponse
5. Migración Alembic `001_create_users_roles.py`
6. CRUD base para usuarios (sin lógica de negocio aún)
7. Test unitario: crear role, crear usuario, verificar relaciones

**Pruebas:** Ejecutar migración, verificar tablas en MySQL, test pasar.

## **SPRINT 1.2 - Seed Inicial y Usuario Admin**
**Prompt:** Crea sistema de seeds iniciales:
1. Script `seed_database.py` con función principal
2. Datos iniciales: roles (1-5), condiciones, unidades básicas, categorías
3. Crear usuario Super Admin desde variables de entorno
4. Validar que solo se ejecuta en desarrollo
5. Comando CLI para ejecutar seeds
6. Test: verificar que seeds no duplican datos
7. Endpoint `/system/health` básico (sin auth)

**Pruebas:** Ejecutar seeds, verificar 5 roles creados, admin accesible.

## **SPRINT 2.1 - Autenticación JWT Backend**
**Prompt:** Implementa sistema JWT completo en backend:
1. Dependencia `get_current_user` que valida token
2. Funciones: `create_access_token`, `create_refresh_token`, `verify_token`
3. Endpoints: `/auth/register` (rol 5 automático), `/auth/login`, `/auth/refresh`
4. Hash de contraseñas con bcrypt
5. Middleware CORS configurable
6. Respuestas estándar de error (401, 403, 422)
7. Test: registro, login, token válido, token expirado

**Pruebas:** Registrar usuario → verificar rol 5, login → obtener tokens, refresh funcionando.

## **SPRINT 2.2 - Sesiones y Refresh Token Storage**
**Prompt:** Implementa gestión de sesiones y persistencia de refresh tokens:
1. Modelo `Session` con: id, user_id, refresh_token_hash, device_info, ip_address, created_at, expires_at, revoked_at
2. Endpoint `/auth/logout` que revoca refresh token
3. Endpoint `/auth/sessions` (listar sesiones activas del usuario)
4. Middleware que registra última actividad
5. Limpieza automática de sesiones expiradas (job opcional)
6. Test: múltiples dispositivos, logout revoca solo una sesión

**Pruebas:** Login desde 2 dispositivos → ver 2 sesiones activas, logout desde uno → ver 1 sesión.

## **SPRINT 2.3 - Contexto de Autenticación Frontend**
**Prompt:** Crea AuthContext en React para gestión de estado de autenticación:
1. Contexto con: user, tokens, loading, error, login, logout, register, refresh
2. Hook `useAuth()` para acceder al contexto
3. Persistencia segura: access token en memoria, refresh token en SecureStore
4. Interceptor axios que añade token y maneja refresh automático
5. Hook `useProtectedRoute` para redirecciones
6. Pantalla de loading global
7. Test: mock de API, verificar flujos de login/logout

**Pruebas:** Login exitoso → tokens almacenados, navegación protegida funciona.

## **SPRINT 2.4 - Pantallas de Auth Frontend**
**Prompt:** Crea pantallas de autenticación en Expo:
1. `/login`: formulario con email/password, validación, "recordarme"
2. `/register`: formulario con email, password, confirmación, full_name
3. `/forgot-password`: solicitud de reset
4. `/reset-password/[token]`: formulario de nuevo password
5. Componentes reutilizables: Input con validación, Button, Link
6. Toasts para feedback
7. Test: navegación entre pantallas, validación de formularios

**Pruebas:** Flujo completo: register → auto-login → navegar a dashboard → logout.

## **SPRINT 3.1 - Layout Base y Navegación**
**Prompt:** Implementa layout principal con navegación por rol:
1. `RootLayout` con AuthProvider
2. `MainLayout` con: Sidebar dinámico por rol, Topbar con breadcrumbs, contenido principal
3. Sistema de rutas protegidas por rol (expo-router o react-navigation)
4. Breadcrumbs dinámicos basados en rutas
5. Componente `ProtectedRoute` que redirige según autenticación/rol
6. Test: usuario rol 5 ve solo opciones visitante, rol 1 ve todo

**Pruebas:** Login con diferentes roles → verificar sidebar muestra opciones correctas.

## **SPRINT 3.2 - Componentes UI Base**
**Prompt:** Crea componentes UI reutilizables con estética Bootstrap-like:
1. `Button`: variantes (primary, secondary, outline, danger), tamaños, loading state
2. `Card`: con header, body, footer
3. `Modal`: reusable con backdrop
4. `Toast`: sistema de notificaciones
5. `Table`: con paginación básica
6. `FormGroup`: wrapper para inputs con labels y errores
7. Tema de colores Bootstrap (primary: #0d6efd, etc.)
8. Test: componentes renderizan correctamente en móvil/web

**Pruebas:** Verificar responsive, accesibilidad, consistencia visual.

## **SPRINT 4.1 - Modelos de Catálogo: Productos**
**Prompt:** Crea modelos para catálogo de productos:
1. Tabla `products`: sku, barcode, name, description, category_id, unit_id, cost, price, min_stock, target_stock, has_batch, has_expiration, is_active
2. Tabla `product_batches`: batch_number, manufactured_date, expiration_date, quantity
3. Tabla `categories` y `units` (ya en seeds)
4. Relaciones: Product → Category, Product → Unit, Product → Batches (one-to-many)
5. Schemas Pydantic completos
6. Migración `002_create_products.py`
7. Test: crear producto con y sin lote

**Pruebas:** Migración ejecuta, productos se persisten correctamente.

## **SPRINT 4.2 - Endpoints Catálogo Público**
**Prompt:** Implementa endpoints de solo lectura para catálogo:
1. `GET /products/`: listar con filtros (search, category, pagination)
2. `GET /products/{id}`: detalle del producto
3. `GET /products/scan/{code}`: buscar por SKU o barcode
4. `GET /categories/`, `GET /units/`: listar catálogos
5. Dependencia que filtra campos sensibles (cost, price) para rol 5
6. Optimizaciones: índices para búsqueda
7. Test: rol 5 no ve costos, rol 1 sí ve

**Pruebas:** Rol 5 accede a endpoints → ver datos limitados.

## **SPRINT 4.3 - Pantalla Catálogo Frontend (Rol 5)**
**Prompt:** Crea pantallas de catálogo para rol Visitante:
1. `/visitor/catalog`: grid/cards de productos, filtros (search, categoría), ordenamiento
2. `/visitor/catalog/{id}`: detalle del producto (sin info sensible)
3. Componente `ProductCard` con imagen placeholder
4. Estados: loading, empty, error
5. Búsqueda por cámara (opcional para este sprint)
6. Test: navegación, filtros funcionan, responsive design

**Pruebas:** Rol 5 navega catálogo, ve productos, no ve botones de edición.

## **SPRINT 5.1 - Modelos de Almacenes y Ubicaciones**
**Prompt:** Crea modelos para gestión de almacenes:
1. Tabla `warehouses`: code, name, location, is_active, created_by
2. Tabla `locations`: warehouse_id, parent_location_id, code, name, path (generated)
3. Relaciones jerárquicas (self-referencing)
4. Validaciones: código único por almacén, estructura árbol válida
5. Schemas completos
6. Migración `003_create_warehouses.py`
7. Test: crear almacén con ubicaciones anidadas

**Pruebas:** Estructura jerárquica se persiste correctamente.

## **SPRINT 5.2 - Endpoints CRUD Almacenes**
**Prompt:** Implementa endpoints para gestión de almacenes (roles 1-2):
1. `GET /warehouses/`: listar (con paginación)
2. `POST /warehouses/`: crear (validar código único)
3. `GET /warehouses/{id}`: detalle con ubicaciones
4. `PUT /warehouses/{id}`: actualizar
5. `DELETE /warehouses/{id}`: desactivar (soft delete)
6. `GET /warehouses/{id}/locations`: ubicaciones del almacén
7. `POST /warehouses/{id}/locations`: crear ubicación
8. Test CRUD completo con permisos

**Pruebas:** Rol 2 puede CRUD, rol 3 solo lectura, rol 4/5 no acceso.

## **SPRINT 5.3 - Pantallas Gestión Almacenes Frontend**
**Prompt:** Crea pantallas para gestión de almacenes:
1. `/admin/warehouses`: tabla listado, botón crear
2. `/admin/warehouses/create`: formulario creación
3. `/admin/warehouses/{id}/edit`: formulario edición
4. `/admin/warehouses/{id}/locations`: gestión de ubicaciones (tree view)
5. Modal para crear/editar ubicaciones
6. Confirmación para desactivar
7. Test: flujo completo CRUD con validaciones

**Pruebas:** Rol 1/2 crea almacén → añade ubicaciones → edita → desactiva.

## **SPRINT 6.1 - Endpoints CRUD Productos (Backend)**
**Prompt:** Implementa endpoints completos para productos (roles 1-2):
1. `POST /products/`: crear con validaciones (SKU único, barcode único)
2. `PUT /products/{id}`: actualizar
3. `DELETE /products/{id}`: desactivar
4. `GET /products/{id}/batches`: lotes del producto
5. `POST /products/{id}/batches`: crear lote
6. `PUT /products/batches/{id}`: actualizar lote
7. Validaciones específicas por tipo de producto
8. Test: crear producto con lotes, actualizar stock vía lotes

**Pruebas:** Producto con gestión de lotes funciona correctamente.

## **SPRINT 6.2 - Pantallas Gestión Productos Frontend**
**Prompt:** Crea pantallas CRUD para productos:
1. `/admin/products`: tabla con filtros avanzados, export CSV
2. `/admin/products/create`: formulario multi-step (info básica, stock, lotes)
3. `/admin/products/{id}/edit`: edición con pestañas
4. `/admin/products/{id}/batches`: gestión de lotes
5. Componente `BatchTable` para lotes
6. Validación en tiempo real de SKU único
7. Test: flujo completo con producto con/sin lotes

**Pruebas:** Crear producto complejo (con lotes, caducidad) → ver en catálogo público.

## **SPRINT 7.1 - Modelos de Movimientos y Solicitudes**
**Prompt:** Crea modelos para sistema de movimientos:
1. Tabla `movement_requests`: type, status, requested_by, approved_by, source/dest warehouse, reason, reference
2. Tabla `movement_request_items`: request_id, product_id, batch_id, quantity, notes
3. Tabla `movements` (ledger): movement_request_id, type, product_id, warehouse_id, quantity, previous_balance, new_balance
4. Estados y transiciones válidas
5. Schemas complejos con items anidados
6. Migración `004_create_movements.py`
7. Test: creación solicitud con múltiples items

**Pruebas:** Solicitud se persiste con items, estados funcionan.

## **SPRINT 7.2 - Endpoints Solicitudes (Rol 4)**
**Prompt:** Implementa endpoints para solicitudes de movimiento (rol 4):
1. `POST /movements/requests/`: crear solicitud (draft)
2. `PUT /movements/requests/{id}`: actualizar (solo draft)
3. `POST /movements/requests/{id}/submit`: enviar para aprobación (draft→pending)
4. `GET /movements/requests/my`: mis solicitudes (filtros por estado)
5. `GET /movements/requests/{id}`: detalle con items e historial
6. Validaciones: stock disponible para salidas, warehouses válidos
7. Test: flujo draft → submit, validación stock insuficiente

**Pruebas:** Rol 4 crea solicitud de salida → submit → queda pending.

## **SPRINT 7.3 - Pantalla Crear Solicitud Frontend**
**Prompt:** Crea pantalla para crear solicitudes (rol 4):
1. `/operator/requests/create`: formulario con:
   - Select tipo (entry/exit/transfer/adjustment)
   - Select almacén(es) según tipo
   - Tabla de items (buscar producto por SKU/código/cámara)
   - Cantidades, notas por item
   - Campo motivo obligatorio
   - Adjuntos opcionales
2. Componente `ProductSearch` con autocomplete
3. Validación en tiempo real
4. Guardar como draft
5. Test: crear solicitud compleja con múltiples items

**Pruebas:** Rol 4 crea solicitud con 3 items → guarda draft → edita → submit.

## **SPRINT 8.1 - Endpoints Aprobación (Roles 1-3)**
**Prompt:** Implementa endpoints para aprobación de movimientos:
1. `GET /movements/requests/pending`: bandeja de pendientes (filtrado por rol)
2. `POST /movements/requests/{id}/approve`: aprobar con comentario
3. `POST /movements/requests/{id}/reject`: rechazar con comentario
4. `POST /movements/requests/{id}/apply`: aplicar movimiento (genera ledger)
5. Lógica de aplicación: actualiza balances, genera movimiento en ledger
6. Validación de concurrencia (evitar doble aplicación)
7. Test: aprobación → aplicación → verificar stock actualizado

**Pruebas:** Aprobar solicitud → aplicar → verificar ledger y stock.

## **SPRINT 8.2 - Pantalla Bandeja Aprobación Frontend**
**Prompt:** Crea pantalla de aprobación para moderadores/admins:
1. `/moderator/requests/pending`: tabla de solicitudes pendientes
2. `/moderator/requests/{id}`: detalle para aprobación
   - Vista completa de solicitud
   - Historial de estados
   - Formulario para comentario de aprobación/rechazo
   - Botones Approve/Reject
3. Notificaciones de nuevas solicitudes (opcional)
4. Filtros por tipo, fecha, almacén
5. Test: rol 3 aprueba solicitud → estado cambia, rol 4 ve actualizado

**Pruebas:** Flujo completo: rol 4 solicita → rol 3 aprueba → rol 1 aplica.

## **SPRINT 9.1 - Sistema de Ledger y Cálculo de Stock**
**Prompt:** Implementa lógica de ledger y cálculo de stock en tiempo real:
1. Función `calculate_current_stock(product_id, warehouse_id)`: suma movimientos aplicados
2. Endpoint `GET /movements/stock`: existencias actuales (filtros por producto/almacén)
3. Endpoint `GET /products/{id}/ledger`: kardex completo
4. Endpoint `GET /warehouses/{id}/stock`: inventario completo del almacén
5. Índices optimizados para consultas frecuentes
6. Cache simple para consultas pesadas (opcional)
7. Test: verificar cálculo después de múltiples movimientos

**Pruebas:** Realizar 5 movimientos → verificar stock calculado correctamente.

## **SPRINT 9.2 - Pantallas Stock y Kardex Frontend**
**Prompt:** Crea pantallas para consulta de stock:
1. `/moderator/inventory`: dashboard de existencias
   - Tabla con productos, almacenes, stock actual
   - Alertas visuales para stock bajo mínimo
   - Filtros avanzados
2. `/moderator/inventory/{product_id}/ledger`: kardex del producto
   - Tabla con todos los movimientos
   - Gráfico de evolución (opcional)
3. Export a CSV
4. Responsive: en móvil vista simplificada
5. Test: navegación, filtros, export funcionan

**Pruebas:** Verificar que stock mostrado coincide con cálculo backend.

## **SPRINT 10.1 - Modelos y Endpoints Herramientas**
**Prompt:** Implementa módulo de herramientas:
1. Modelo `tools`: product_id, serial_number, condition_id, assigned_to, location_id, status
2. Endpoints CRUD (roles 1-2)
3. Endpoints específicos: assign, check-in, check-out, history
4. Validaciones: serial único, condición válida
5. Relación con productos para atributos comunes
6. Test: asignar herramienta, cambiar condición

**Pruebas:** Asignar herramienta a usuario → ver en perfil del usuario.

## **SPRINT 10.2 - Pantallas Gestión Herramientas**
**Prompt:** Crea pantallas para gestión de herramientas:
1. `/admin/tools`: listado con filtros (serial, condición, responsable)
2. `/admin/tools/create`: formulario con select de producto + campos específicos
3. `/admin/tools/{id}/assign`: modal para asignar a usuario/proyecto
4. `/operator/tools`: herramientas asignadas a mí
5. `/operator/tools/{id}/check-out`: registrar salida con condición
6. Historial de movimientos por herramienta
7. Test: asignar, usar, devolver herramienta

**Pruebas:** Flujo completo de asignación y uso de herramienta.

## **SPRINT 11.1 - Modelos y Endpoints EPP**
**Prompt:** Implementa módulo EPP con gestión de vida útil:
1. Modelo `epp`: product_id, size, certification, assignment_date, expiration_date, useful_life_days, inspection dates, status
2. Modelo `epp_inspections`: epp_id, inspection_date, inspector_id, passed, notes, evidence_id
3. Endpoints CRUD
4. Endpoint `GET /epp/expiring`: próximos a caducar
5. Endpoint `POST /epp/{id}/inspect`: registrar inspección
6. Endpoint `POST /epp/{id}/replace`: crear reemplazo automático
7. Test: caducidad automática, alertas

**Pruebas:** Crear EPP con vida útil 30 días → ver alerta a los 25 días.

## **SPRINT 11.2 - Pantallas EPP y Alertas**
**Prompt:** Crea pantallas para gestión EPP:
1. `/admin/epp`: listado con semáforo de caducidad
2. `/admin/epp/create`: formulario específico
3. `/moderator/epp/inspections`: bandeja de inspecciones pendientes
4. `/operator/epp`: mi EPP asignado
5. Dashboard `/moderator/dashboard/epp`: gráfico de vencimientos por mes (MUI X)
6. Notificaciones push para vencimientos (opcional)
7. Test: inspección, caducidad, reemplazo automático

**Pruebas:** EPP caduca → sistema sugiere reemplazo → crear nuevo.

## **SPRINT 12.1 - Modelos y Endpoints Vehículos**
**Prompt:** Implementa módulo de control vehicular:
1. Modelo `vehicles`: vin, license_plate, brand, model, year, assigned_to, insurance/verification/tenency data, odometer, status
2. Modelo `vehicle_maintenances`: vehicle_id, type, date, provider, cost, odometer, description, evidence_id
3. Modelo `vehicle_documents`: vehicle_id, document_type, expiration_date, verified, verified_by, evidence_id
4. Endpoints CRUD completos
5. Endpoint para validar documentos (con evidencia obligatoria)
6. Test: crear vehículo, registrar mantenimiento, validar documento

**Pruebas:** Subir evidencia de verificación → validar → marcar como cumplido.

## **SPRINT 12.2 - Pantallas Control Vehicular**
**Prompt:** Crea pantallas para gestión vehicular:
1. `/admin/vehicles`: listado con semáforo de documentos
2. `/admin/vehicles/{id}`: detalle con tabs (info, documentos, mantenimientos)
3. `/moderator/vehicles/pending-validation`: documentos pendientes de validar
4. Componente de subida de evidencias (foto/PDF)
5. Timeline visual de documentos y mantenimientos
6. Alertas automáticas de vencimiento
7. Test: flujo completo de validación con evidencia

**Pruebas:** Rol 3 valida documento con foto → sistema registra verificación.

## **SPRINT 13.1 - Endpoints Reportes y Dashboards Backend**
**Prompt:** Implementa endpoints agregados para reportes:
1. `GET /reports/inventory/summary`: resumen inventario (total items, valor estimado)
2. `GET /reports/inventory/turnover`: rotación por producto/categoría
3. `GET /reports/movements/summary`: movimientos por tipo/periodo
4. `GET /reports/vehicles/compliance`: cumplimiento documental
5. `GET /reports/epp/expiration`: caducidades próximas
6. Optimizaciones con queries agregadas, índices
7. Test: datos agregados correctos

**Pruebas:** Verificar cálculos complejos con datos de prueba.

## **SPRINT 13.2 - Dashboards Frontend con Gráficos**
**Prompt:** Crea dashboards con MUI X Charts:
1. `/admin/dashboard`: overview con KPIs principales
2. `/moderator/dashboard`: KPIs operativos
3. Gráficos: barras (movimientos por día), líneas (stock evolutivo), pie (categorías), tablas (top productos)
4. Filtros por fechas dinámicas
5. Export a PDF/CSV
6. Responsive: gráficos adaptan a pantalla
7. Test: dashboards cargan con datos reales

**Pruebas:** Verificar que gráficos se actualizan con filtros.

## **SPRINT 14.1 - Endpoints Gestión Usuarios (Backend)**
**Prompt:** Implementa CRUD usuarios con reglas RBAC finas:
1. `GET /users/`: listar (roles 1-2), con filtros
2. `POST /users/`: crear (rol 2 no puede asignar rol 1)
3. `PUT /users/{id}`: actualizar (rol 2 no puede modificar Super Admin)
4. `DELETE /users/{id}`: desactivar (soft delete)
5. `POST /users/{id}/reset-password`: reset password (solo rol 1-2)
6. `GET /users/{id}/audit`: auditoría del usuario
7. Test: permisos específicos por rol

**Pruebas:** Rol 2 intenta modificar rol 1 → error 403.

## **SPRINT 14.2 - Pantallas Gestión Usuarios Frontend**
**Prompt:** Crea pantallas para gestión de usuarios:
1. `/admin/users`: tabla con filtros, acciones masivas
2. `/admin/users/create`: formulario con select de rol (validado)
3. `/admin/users/{id}/edit`: edición con validación de permisos
4. Modal de confirmación para desactivar
5. Modal de reset password
6. Pestaña de auditoría en detalle de usuario
7. Test: flujo completo CRUD con restricciones

**Pruebas:** Rol 1 modifica cualquier usuario, rol 2 no puede modificar rol 1.

## **SPRINT 15.1 - Sistema y Configuración (Backend)**
**Prompt:** Implementa módulo de sistema solo para rol 1:
1. Modelo `system_config`: key, value, description
2. Endpoints: `GET/PUT /system/config`
3. Endpoint `GET /system/logs`: logs auditables con filtros
4. Endpoint `POST /system/cleanup`: limpieza de datos antiguos
5. Endpoint `GET /system/health`: health check completo
6. Endpoint `GET /system/metrics`: métricas de uso
7. Test: solo rol 1 accede

**Pruebas:** Rol 2 intenta acceder a /system/logs → 403.

## **SPRINT 15.2 - Pantallas Sistema Frontend**
**Prompt:** Crea pantallas de administración del sistema:
1. `/superadmin/config`: editor de configuración (formulario key-value)
2. `/superadmin/logs`: visor de logs con filtros avanzados
3. `/superadmin/backup`: interfaz para backup/restore (UI básica)
4. `/superadmin/metrics`: dashboard de métricas del sistema
5. Componentes específicos para administradores
6. Test: navegación y funcionalidades básicas

**Pruebas:** Rol 1 configura parámetro → ver efecto en aplicación.

## **SPRINT 16.1 - Pruebas Backend Completas**
**Prompt:** Crea suite completa de pruebas backend:
1. Fixtures para DB de testing
2. Tests de autenticación y RBAC
3. Tests de integración para movimientos (flujos complejos)
4. Tests de concurrencia (movimientos simultáneos)
5. Tests de validación de stock
6. Coverage report mínimo 80%
7. Configuración pytest en CI

**Pruebas:** Ejecutar toda la suite → verificar coverage.

## **SPRINT 16.2 - Pruebas Frontend Críticas**
**Prompt:** Crea pruebas frontend para flujos críticos:
1. Tests de componentes con React Testing Library
2. Tests de navegación
3. Tests de formularios (login, registro, solicitudes)
4. Tests de permisos y redirecciones
5. E2E básico con Detox (opcional si hay tiempo)
6. Test de responsive design
7. Reporte de cobertura

**Pruebas:** Ejecutar tests frontend → verificar flujos críticos.

## **SPRINT 16.3 - CI/CD y Hardening**
**Prompt:** Implementa CI/CD y medidas de seguridad:
1. GitHub Actions: lint, test, build para backend y frontend
2. Security scanning (dependabot, codeQL)
3. Rate limiting en endpoints de auth
4. Headers de seguridad (CSP, HSTS)
5. Validación de uploads (mime, tamaño, virus scanning opcional)
6. Backup automático de BD (script)
7. Documentación de despliegue

**Pruebas:** Pipeline CI pasa, seguridad headers presentes.

## **SPRINT FINAL - Documentación y Entrega**
**Prompt:** Crea documentación completa:
1. README.md con setup detallado
2. API documentation (Postman collection/OpenAPI)
3. Manual de usuario por rol
4. Diagramas de arquitectura actualizados
5. Guía de contribución
6. Changelog
7. Script de despliegue en producción

**Pruebas:** Documentación completa, proyecto listo para entrega.

---

## **INSTRUCCIONES DE USO**

1. **Inicia con SPRINT 0.1** para configurar backend base
2. Luego **SPRINT 0.2** para frontend base
3. Continúa secuencialmente según dependencias
4. Cada sprint genera código + tests + instrucciones de prueba
5. Verifica cada sprint antes de continuar

**Para comenzar, di: "Genera el código del SPRINT 0.1"**

### sprint 9.2