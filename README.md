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

## Instalación y Ejecución

### Backend
```bash
cd backend
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
