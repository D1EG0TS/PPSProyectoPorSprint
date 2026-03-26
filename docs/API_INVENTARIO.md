# API de Inventario - EXPROOF

## Tabla de Contenidos
1. [Autenticación](#autenticación)
2. [Escaneo de Productos](#escaneo-de-productos)
3. [Recepción de Mercancía](#recepción-de-mercancía)
4. [Ajustes de Inventario](#ajustes-de-inventario)
5. [Transferencias](#transferencias)
6. [Ubicaciones y Almacenes](#ubicaciones-y-almacenes)
7. [Conteo Cíclico](#conteo-cíclico)
8. [Reportes de Inventario](#reportes-de-inventario)
9. [Códigos de Error](#códigos-de-error)
10. [Ejemplos con cURL](#ejemplos-con-curl)

---

## Autenticación

Todos los endpoints requieren autenticación JWT. Incluir el token en el header:

```
Authorization: Bearer <token>
```

### Login

```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=email@example.com&password=password123
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

---

## Escaneo de Productos

### Escanear producto o ubicación

Busca un producto por SKU, código de barras, o código de ubicación.

```http
POST /inventory/scan
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "SKU-001"
}
```

**Parámetros de Query:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `warehouse_id` | int | (Opcional) Filtrar por almacén |

**Response - Producto encontrado:**
```json
{
  "found": true,
  "product_id": 1,
  "sku": "SKU-001",
  "barcode": "1234567890",
  "name": "Producto de Ejemplo",
  "brand": "Marca X",
  "model": "Modelo Y",
  "category": "Electrónica",
  "unit": "pcs",
  "current_stock": 150,
  "min_stock": 10,
  "has_batch": false,
  "has_expiration": false,
  "locations": [
    {
      "location_id": 1,
      "location_code": "A-01-01",
      "warehouse_name": "Almacén Central",
      "quantity": 150,
      "batch_number": null,
      "expiration_date": null,
      "is_primary": true
    }
  ]
}
```

**Response - Ubicación encontrada:**
```json
{
  "found": true,
  "product_id": null,
  "name": "Ubicación: Estante A-01",
  "current_stock": 250,
  "locations": [
    {
      "location_id": 1,
      "location_code": "A-01-01",
      "warehouse_name": "Almacén Central",
      "quantity": 100,
      "batch_number": null,
      "expiration_date": null,
      "is_primary": true
    }
  ]
}
```

**Response - No encontrado:**
```json
{
  "found": false,
  "product_id": null,
  "sku": "UNKNOWN-CODE",
  "barcode": null,
  "name": null
}
```

---

## Recepción de Mercancía

### Recibir mercancía

Recibe productos en un almacén y crea un movimiento de tipo IN.

```http
POST /inventory/receive
Authorization: Bearer <token>
Content-Type: application/json

{
  "warehouse_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 50,
      "batch_number": "LOTE-001",
      "expiration_date": "2025-12-31",
      "location_id": 1
    }
  ],
  "reference": "OC-2024-001",
  "notes": "Compra de mercancía"
}
```

**Request Body:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `warehouse_id` | int | Sí | ID del almacén destino |
| `items` | array | Sí | Lista de productos a recibir |
| `items[].product_id` | int | Sí | ID del producto |
| `items[].quantity` | int | Sí | Cantidad a recibir |
| `items[].batch_number` | string | No | Número de lote (si aplica) |
| `items[].expiration_date` | date | No | Fecha de caducidad (YYYY-MM-DD) |
| `items[].location_id` | int | No | ID de ubicación específica |
| `reference` | string | No | Referencia (OC, factura, etc.) |
| `notes` | string | No | Notas adicionales |

**Response:**
```json
{
  "success": true,
  "movement_request_id": 123,
  "request_number": "IN-20240325143022",
  "items_received": 1,
  "message": "Mercancía recibida exitosamente"
}
```

---

## Ajustes de Inventario

### Crear ajuste

Crea un ajuste de inventario (aumento o disminución).

```http
POST /inventory/adjust
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "product_id": 1,
      "warehouse_id": 1,
      "location_id": 1,
      "quantity": -5,
      "reason": "DAMAGE",
      "notes": "Producto dañado durante transporte"
    }
  ],
  "reference": "Ajuste mensual"
}
```

**Razones de ajuste:**
| Valor | Descripción |
|-------|-------------|
| `RECOUNT` | Conteo físico |
| `DAMAGE` | Producto dañado |
| `THEFT` | Robo o pérdida |
| `EXPIRED` | Producto vencido |
| `CORRECTION` | Corrección manual |
| `OTHER` | Otro |

**Request Body:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `items` | array | Sí | Lista de ajustes |
| `items[].product_id` | int | Sí | ID del producto |
| `items[].warehouse_id` | int | Sí | ID del almacén |
| `items[].location_id` | int | No | ID de ubicación |
| `items[].quantity` | int | Sí | Cantidad (positiva o negativa) |
| `items[].reason` | string | Sí | Razón del ajuste |
| `items[].notes` | string | No | Notas adicionales |
| `reference` | string | No | Referencia del ajuste |

**Response:**
```json
{
  "success": true,
  "movement_request_id": 124,
  "request_number": "ADJ-20240325143500",
  "adjustments_count": 1,
  "message": "Ajuste de inventario realizado exitosamente"
}
```

### Historial de ajustes

```http
GET /inventory/adjustments
Authorization: Bearer <token>
```

**Parámetros de Query:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `product_id` | int | Filtrar por producto |
| `warehouse_id` | int | Filtrar por almacén |
| `reason` | string | Filtrar por razón |
| `start_date` | datetime | Fecha inicio |
| `end_date` | datetime | Fecha fin |
| `page` | int | Página (default: 1) |
| `page_size` | int | Elementos por página (default: 20) |

**Response:**
```json
{
  "adjustments": [
    {
      "id": 1,
      "request_number": "ADJ-20240325143500",
      "product_id": 1,
      "product_name": "Producto de Ejemplo",
      "product_sku": "SKU-001",
      "warehouse_id": 1,
      "warehouse_name": "Almacén Central",
      "location_code": "A-01-01",
      "quantity_change": -5,
      "previous_stock": 150,
      "new_stock": 145,
      "reason": "DAMAGE",
      "notes": "Producto dañado",
      "adjusted_by": 1,
      "adjusted_by_name": "Juan Pérez",
      "created_at": "2024-03-25T14:35:00"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

## Transferencias

### Crear transferencia

Transfiere productos entre almacenes o ubicaciones.

```http
POST /inventory/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "source_warehouse_id": 1,
  "destination_warehouse_id": 2,
  "items": [
    {
      "product_id": 1,
      "quantity": 20,
      "source_location_id": 1,
      "destination_location_id": 5
    }
  ],
  "reference": "TR-001",
  "notes": "Reabastecimiento almacén norte"
}
```

**Request Body:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `source_warehouse_id` | int | Sí | ID del almacén origen |
| `destination_warehouse_id` | int | Sí | ID del almacén destino |
| `items` | array | Sí | Lista de productos a transferir |
| `items[].product_id` | int | Sí | ID del producto |
| `items[].quantity` | int | Sí | Cantidad a transferir |
| `items[].source_location_id` | int | No | Ubicación de origen específica |
| `items[].destination_location_id` | int | No | Ubicación de destino específica |
| `items[].batch_number` | string | No | Número de lote |
| `reference` | string | No | Referencia de la transferencia |
| `notes` | string | No | Notas adicionales |

**Response:**
```json
{
  "success": true,
  "movement_request_id": 125,
  "request_number": "TR-20240325144000",
  "items_transferred": 1,
  "message": "Transferencia de 1 producto(s) completada exitosamente"
}
```

### Historial de transferencias

```http
GET /inventory/transfers
Authorization: Bearer <token>
```

**Parámetros de Query:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `product_id` | int | Filtrar por producto |
| `source_warehouse_id` | int | Filtrar por almacén origen |
| `destination_warehouse_id` | int | Filtrar por almacén destino |
| `start_date` | datetime | Fecha inicio |
| `end_date` | datetime | Fecha fin |
| `page` | int | Página (default: 1) |
| `page_size` | int | Elementos por página (default: 20) |

**Response:**
```json
{
  "transfers": [
    {
      "id": 1,
      "request_number": "TR-20240325144000",
      "product_id": 1,
      "product_name": "Producto de Ejemplo",
      "product_sku": "SKU-001",
      "source_warehouse_id": 1,
      "source_warehouse_name": "Almacén Central",
      "destination_warehouse_id": 2,
      "destination_warehouse_name": "Almacén Norte",
      "source_location_code": "A-01-01",
      "destination_location_code": "B-02-03",
      "quantity": 20,
      "notes": "Reabastecimiento",
      "transferred_by": 1,
      "transferred_by_name": "Juan Pérez",
      "created_at": "2024-03-25T14:40:00"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

## Ubicaciones y Almacenes

### Listar almacenes

```http
GET /inventory/warehouses
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "code": "ALM-CENTRAL",
    "name": "Almacén Central",
    "location": "Ciudad de México"
  },
  {
    "id": 2,
    "code": "ALM-NORTE",
    "name": "Almacén Norte",
    "location": "Monterrey"
  }
]
```

### Ubicaciones disponibles

```http
GET /inventory/locations/available?warehouse_id=1
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "code": "A-01-01",
    "name": "Estante A-01",
    "path": "ZONA A / PASILLO 01 / NIVEL 01",
    "capacity": 100,
    "current_occupancy": 45,
    "available": 55,
    "has_capacity": true
  },
  {
    "id": 2,
    "code": "A-01-02",
    "name": "Estante A-02",
    "path": "ZONA A / PASILLO 01 / NIVEL 02",
    "capacity": 100,
    "current_occupancy": 0,
    "available": 100,
    "has_capacity": true
  }
]
```

### Capacidad de ubicación

```http
GET /inventory/locations/{location_id}/capacity
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "code": "A-01-01",
  "name": "Estante A-01",
  "capacity": 100,
  "current_occupancy": 45,
  "available": 55
}
```

### Actualizar capacidad

```http
PUT /inventory/locations/{location_id}/capacity
Authorization: Bearer <token>
Content-Type: application/json

{
  "capacity": 150
}
```

### Ubicaciones de un producto

```http
GET /inventory/product/{product_id}/locations?warehouse_id=1
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "location_id": 1,
    "location_code": "A-01-01",
    "warehouse_name": "Almacén Central",
    "quantity": 100,
    "batch_number": null,
    "expiration_date": null,
    "is_primary": true
  }
]
```

---

## Ejemplos con cURL

### Login y obtener token

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@exproof.com&password=admin123"
```

### Escanear producto

```bash
curl -X POST "http://localhost:8000/inventory/scan" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "SKU-001"}'
```

### Recibir mercancía

```bash
curl -X POST "http://localhost:8000/inventory/receive" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": 1,
    "items": [{"product_id": 1, "quantity": 100}],
    "reference": "OC-2024-001"
  }'
```

### Crear ajuste

```bash
curl -X POST "http://localhost:8000/inventory/adjust" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "product_id": 1,
      "warehouse_id": 1,
      "quantity": -5,
      "reason": "DAMAGE",
      "notes": "Producto dañado"
    }]
  }'
```

### Crear transferencia

```bash
curl -X POST "http://localhost:8000/inventory/transfer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_warehouse_id": 1,
    "destination_warehouse_id": 2,
    "items": [{"product_id": 1, "quantity": 20}]
  }'
```

---

## Conteo Cíclico

### Crear sesión de conteo

```http
POST /inventory/cycle-count
Authorization: Bearer <token>
Content-Type: application/json

{
  "warehouse_id": 1,
  "location_ids": [1, 2, 3],
  "product_ids": [1, 2, 3],
  "priority": "NORMAL",
  "notes": "Conteo mensual zona A"
}
```

**Request Body:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `warehouse_id` | int | Sí | ID del almacén |
| `location_ids` | array | No | IDs de ubicaciones específicas |
| `product_ids` | array | No | IDs de productos específicos |
| `priority` | string | No | `LOW`, `NORMAL`, `HIGH` |
| `notes` | string | No | Notas adicionales |

**Response:**
```json
{
  "id": 1,
  "request_number": "CC-20240325143022",
  "warehouse_id": 1,
  "warehouse_name": "Almacén Central",
  "status": "PENDING",
  "priority": "NORMAL",
  "total_items": 15,
  "items_counted": 0,
  "items_with_variance": 0,
  "notes": "Conteo mensual zona A",
  "created_by": 1,
  "created_by_name": "Juan Pérez",
  "created_at": "2024-03-25T14:30:22"
}
```

### Listar sesiones de conteo

```http
GET /inventory/cycle-count
Authorization: Bearer <token>
```

**Parámetros de Query:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `warehouse_id` | int | Filtrar por almacén |
| `status` | string | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `page` | int | Página |
| `page_size` | int | Elementos por página |

### Detalle de sesión de conteo

```http
GET /inventory/cycle-count/{count_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "request_number": "CC-20240325143022",
  "warehouse_id": 1,
  "warehouse_name": "Almacén Central",
  "status": "IN_PROGRESS",
  "total_items": 15,
  "items_counted": 5,
  "items_with_variance": 2,
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "Producto de Ejemplo",
      "product_sku": "SKU-001",
      "location_id": 1,
      "location_code": "A-01-01",
      "system_stock": 100,
      "counted_stock": 98,
      "variance": -2,
      "variance_percentage": -2.0,
      "notes": null,
      "counted_by": 1,
      "counted_by_name": "Operador 1",
      "counted_at": "2024-03-25T15:00:00"
    }
  ]
}
```

### Registrar conteo de item

```http
POST /inventory/cycle-count/{count_id}/record
Authorization: Bearer <token>
Content-Type: application/json

{
  "item_id": 1,
  "counted_stock": 98,
  "notes": "Producto dañado encontrado"
}
```

### Completar sesión de conteo

```http
POST /inventory/cycle-count/{count_id}/complete
Authorization: Bearer <token>
```

### Aprobar varianzas

```http
POST /inventory/cycle-count/{count_id}/approve-variances
Authorization: Bearer <token>
Content-Type: application/json

{
  "approvals": [
    {
      "item_id": 1,
      "approve": true,
      "apply_adjustment": true,
      "notes": "Varianza aceptada"
    },
    {
      "item_id": 2,
      "approve": false,
      "notes": "Error en conteo"
    }
  ]
}
```

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

---

## Reportes de Inventario

### Productos por Vencer

```http
GET /inventory/reports/expiring
Authorization: Bearer <token>
```

**Parámetros de Query:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `warehouse_id` | int | Filtrar por almacén |
| `days_ahead` | int | Días hacia adelante (default: 30) |
| `include_expired` | bool | Incluir productos vencidos (default: true) |
| `page` | int | Página |
| `page_size` | int | Elementos por página |

**Response:**
```json
{
  "products": [
    {
      "product_id": 1,
      "product_name": "Producto de Ejemplo",
      "product_sku": "SKU-001",
      "batch_number": "BATCH-001",
      "warehouse_name": "Almacén Central",
      "location_code": "A-01-01",
      "quantity": 50,
      "expiration_date": "2024-04-15",
      "days_until_expiry": 15,
      "is_expired": false
    }
  ],
  "total": 1,
  "expired_count": 0,
  "expiring_soon_count": 1
}
```

### Stock Bajo

```http
GET /inventory/reports/low-stock
Authorization: Bearer <token>
```

**Parámetros de Query:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `warehouse_id` | int | Filtrar por almacén |
| `page` | int | Página |
| `page_size` | int | Elementos por página |

**Response:**
```json
{
  "products": [
    {
      "product_id": 1,
      "product_name": "Producto de Ejemplo",
      "product_sku": "SKU-001",
      "category": "Electrónica",
      "current_stock": 5,
      "min_stock": 10,
      "max_stock": 50,
      "stock_percentage": 50.0,
      "warehouse_name": "Almacén Central",
      "last_updated": null
    }
  ],
  "total": 1,
  "critical_count": 0,
  "warning_count": 1
}
```

### Resumen de Inventario

```http
GET /inventory/reports/summary
Authorization: Bearer <token>
```

**Parámetros de Query:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `warehouse_id` | int | Filtrar por almacén |

**Response:**
```json
{
  "total_products": 100,
  "total_stock": 5000,
  "total_value": null,
  "low_stock_count": 10,
  "expiring_soon_count": 5,
  "out_of_stock_count": 2,
  "by_category": [
    {
      "category_id": 1,
      "category_name": "Electrónica",
      "total_products": 50,
      "total_stock": 2500,
      "total_value": null
    }
  ],
  "by_warehouse": [
    {
      "warehouse_id": 1,
      "warehouse_name": "Almacén Central",
      "warehouse_code": "ALM-01",
      "total_products": 50,
      "total_stock": 2500,
      "low_stock_count": 5,
      "expiring_soon_count": 3
    }
  ]
}
```

---

## Mapa Visual del Almacén

### Tipos de Celda

| Tipo | Descripción |
|------|-------------|
| `zone` | Zona general |
| `aisle` | Pasillo |
| `rack` | Estante/Rack |
| `shelf` | Anaquel |
| `storage` | Almacenamiento |
| `receiving` | Area de recepción |
| `shipping` | Area de envío |
| `staging` | Area de preparación |
| `empty` | Celda vacía |

### Niveles de Ocupación

| Nivel | Descripción |
|-------|-------------|
| `empty` | Sin ocupación (0%) |
| `low` | Ocupación baja (1-25%) |
| `medium` | Ocupación media (26-50%) |
| `high` | Ocupación alta (51-75%) |
| `full` | Ocupación completa (76-100%) |

### Listar Layouts

```http
GET /inventory/layout/
Authorization: Bearer <token>
```

**Parámetros de Query:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `skip` | int | Offset (default: 0) |
| `limit` | int | Limite (default: 100) |

**Response:**
```json
[
  {
    "id": 1,
    "warehouse_id": 1,
    "name": "Layout Almacén Central",
    "grid_rows": 10,
    "grid_cols": 10,
    "cell_width": 100,
    "cell_height": 100,
    "is_active": true
  }
]
```

### Crear Layout

```http
POST /inventory/layout/
Authorization: Bearer <token>
Content-Type: application/json

{
  "warehouse_id": 1,
  "name": "Layout Almacén Central",
  "description": "Layout principal del almacén",
  "grid_rows": 10,
  "grid_cols": 10,
  "cell_width": 100,
  "cell_height": 100
}
```

### Obtener Layout con Celdas

```http
GET /inventory/layout/{layout_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "warehouse_id": 1,
  "name": "Layout Almacén Central",
  "grid_rows": 10,
  "grid_cols": 10,
  "cell_width": 100,
  "cell_height": 100,
  "cells": [
    {
      "id": 1,
      "layout_id": 1,
      "row": 0,
      "col": 0,
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 100,
      "cell_type": "storage",
      "name": "Estante A-1",
      "color": null,
      "occupancy_level": "low",
      "occupancy_percentage": 15.5,
      "linked_location_id": null
    }
  ]
}
```

### Generar Grid Vacío

```http
POST /inventory/layout/{layout_id}/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "rows": 5,
  "cols": 5,
  "cell_width": 100,
  "cell_height": 100
}
```

### Obtener Heatmap

```http
GET /inventory/layout/{layout_id}/heatmap
Authorization: Bearer <token>
```

**Response:**
```json
{
  "layout_id": 1,
  "warehouse_id": 1,
  "cells": [
    {
      "row": 0,
      "col": 0,
      "occupancy_percentage": 50,
      "occupancy_level": "medium",
      "product_count": 5
    }
  ],
  "average_occupancy": 35.5,
  "total_capacity": 100,
  "total_occupancy": 35.5
}
```

### Exportar Layout

```http
GET /inventory/layout/{layout_id}/export
Authorization: Bearer <token>
```

**Response:**
```json
{
  "name": "Layout Almacén Central",
  "description": "Layout principal",
  "grid_rows": 10,
  "grid_cols": 10,
  "cell_width": 100,
  "cell_height": 100,
  "cells": [...],
  "exported_at": "2024-03-25 12:00:00"
}
```

### Importar Layout

```http
POST /inventory/layout/import?warehouse_id=1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Layout Importado",
  "grid_rows": 10,
  "grid_cols": 10,
  "cell_width": 100,
  "cell_height": 100,
  "cells": [...]
}
```

### Operaciones con Celdas

**Crear celda:**
```http
POST /inventory/layout/{layout_id}/cells
Authorization: Bearer <token>
Content-Type: application/json

{
  "row": 0,
  "col": 0,
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 100,
  "cell_type": "storage",
  "name": "Estante A-1"
}
```

**Actualizar celda:**
```http
PUT /inventory/layout/{layout_id}/cells/{cell_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "cell_type": "rack",
  "name": "Estante A-2"
}
```

**Eliminar celda:**
```http
DELETE /inventory/layout/{layout_id}/cells/{cell_id}
Authorization: Bearer <token>
```

---

## Sistema de Etiquetas (Labels)

Base URL: `/inventory/labels`

### Tipos de Código de Barras
- `qr` - Código QR
- `code128` - Code 128
- `code39` - Code 39
- `ean13` - EAN-13

### Tamaños de Etiqueta
- `small` - 50x25 mm
- `medium` - 70x35 mm
- `large` - 100x50 mm
- `custom` - Personalizado

### Gestión de Plantillas

**Listar plantillas:**
```http
GET /inventory/labels/templates
Authorization: Bearer <token>
```

**Crear plantilla:**
```http
POST /inventory/labels/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Etiqueta Producto Estándar",
  "label_type": "qr",
  "label_size": "medium",
  "width_mm": 70,
  "height_mm": 35,
  "qr_size": 100,
  "barcode_height": 30,
  "font_name": "Helvetica",
  "font_size": 8,
  "show_border": true,
  "border_width": 1,
  "background_color": "#FFFFFF",
  "text_color": "#000000",
  "include_product_name": true,
  "include_sku": true,
  "include_barcode": true,
  "include_location": false,
  "include_batch": false,
  "include_expiration": false
}
```

**Obtener plantilla:**
```http
GET /inventory/labels/templates/{template_id}
Authorization: Bearer <token>
```

**Actualizar plantilla:**
```http
PUT /inventory/labels/templates/{template_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nueva Nombre",
  "font_size": 10
}
```

**Eliminar plantilla:**
```http
DELETE /inventory/labels/templates/{template_id}
Authorization: Bearer <token>
```

### Generación de Etiquetas

**Generar etiqueta de producto:**
```http
GET /inventory/labels/product/{product_id}?template_id={id}&label_type={type}
Authorization: Bearer <token>
```
Parametros opcionales:
- `template_id`: ID de plantilla (opcional)
- `label_type`: Tipo de código (qr, code128, code39, ean13)

Retorna: PDF con la etiqueta

**Generar etiqueta de ubicación:**
```http
GET /inventory/labels/location/{location_id}?template_id={id}
Authorization: Bearer <token>
```
Parametros opcionales:
- `template_id`: ID de plantilla (opcional)

Retorna: PDF con la etiqueta de ubicación

**Generar etiqueta personalizada:**
```http
POST /inventory/labels/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "template_id": 1,
  "label_type": "code128",
  "data": {
    "product_id": 123,
    "product_name": "Producto Ejemplo",
    "sku": "SKU-001",
    "barcode": "1234567890123",
    "location_code": "A-01-01",
    "location_name": "Estante A pasillo 1",
    "batch": "LOTE-2024-001",
    "expiration_date": "2025-12-31"
  }
}
```

**Impresión por lotes:**
```http
POST /inventory/labels/batch-print
Authorization: Bearer <token>
Content-Type: application/json

{
  "template_id": 1,
  "label_type": "qr",
  "copies_per_label": 1,
  "items": [
    {
      "product_id": 1,
      "product_name": "Producto A",
      "sku": "SKU-A",
      "barcode": "1234567890001"
    },
    {
      "product_id": 2,
      "product_name": "Producto B",
      "sku": "SKU-B",
      "barcode": "1234567890002"
    }
  ]
}
```

Respuesta:
```json
{
  "success": true,
  "filename": "labels_batch_1234567890.pdf",
  "label_count": 2
}
```

---

## Sistema de Proveedores

Base URL: `/suppliers`

### Estados de Proveedor
- `active` - Activo
- `inactive` - Inactivo
- `pending` - Pendiente
- `blocked` - Bloqueado

### Categorías de Proveedor
- `raw_materials` - Materias primas
- `finished_goods` - Productos terminados
- `equipment` - Equipo
- `services` - Servicios
- `packaging` - Empaque
- `other` - Otro

### Gestión de Proveedores

**Listar proveedores:**
```http
GET /suppliers/?search={term}&status={status}&category={category}
Authorization: Bearer <token>
```
Parametros:
- `skip`: Número de registros a omitir (default: 0)
- `limit`: Límite de registros (default: 50, max: 100)
- `search`: Término de búsqueda (nombre, código, email)
- `status`: Filtrar por estado
- `category`: Filtrar por categoría
- `is_active`: Filtrar por estado activo

**Crear proveedor:**
```http
POST /suppliers/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Corp",
  "code": "SUP001",
  "contact_person": "John Doe",
  "email": "john@acme.com",
  "phone": "+52 555 123 4567",
  "address": "Av. Principal 123",
  "city": "Ciudad de México",
  "state": "CDMX",
  "country": "México",
  "postal_code": "06600",
  "tax_id": "TAX123456",
  "rfc": "ACM123456ABC",
  "category": "raw_materials",
  "status": "active",
  "payment_terms_days": 30,
  "credit_limit": 100000.00,
  "rating": 5
}
```

**Obtener proveedor:**
```http
GET /suppliers/{id}
Authorization: Bearer <token>
```

**Actualizar proveedor:**
```http
PUT /suppliers/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nuevo Nombre",
  "status": "active"
}
```

**Eliminar proveedor (soft delete):**
```http
DELETE /suppliers/{id}
Authorization: Bearer <token>
```

**Estadísticas de proveedores:**
```http
GET /suppliers/stats/overview
Authorization: Bearer <token>
```

---

## Sistema de Órdenes de Compra

Base URL: `/purchase-orders`

### Estados de Orden
- `draft` - Borrador
- `pending_approval` - Pendiente aprobación
- `approved` - Aprobada
- `sent` - Enviada al proveedor
- `confirmed` - Confirmada por proveedor
- `in_progress` - En preparación
- `partially_received` - Parcialmente recibida
- `received` - Completamente recibida
- `cancelled` - Cancelada
- `rejected` - Rechazada

### Prioridades
- `low` - Baja
- `normal` - Normal
- `high` - Alta
- `urgent` - Urgente

### Gestión de Órdenes de Compra

**Listar órdenes:**
```http
GET /purchase-orders/?supplier_id={id}&status={status}&search={term}
Authorization: Bearer <token>
```

**Crear orden:**
```http
POST /purchase-orders/
Authorization: Bearer <token>
Content-Type: application/json

{
  "supplier_id": 1,
  "priority": "normal",
  "expected_delivery_date": "2024-03-15",
  "notes": "Entregar en almacén principal",
  "currency": "MXN",
  "shipping_cost": 500.00,
  "items": [
    {
      "product_id": 1,
      "product_name": "Producto A",
      "quantity": 100,
      "unit_price": 25.50,
      "expected_delivery_date": "2024-03-15"
    },
    {
      "product_name": "Producto B",
      "quantity": 50,
      "unit_price": 100.00
    }
  ]
}
```

**Obtener orden:**
```http
GET /purchase-orders/{id}
Authorization: Bearer <token>
```

**Actualizar orden:**
```http
PUT /purchase-orders/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "priority": "high",
  "notes": "Actualización de notas"
}
```

**Flujo de Estados:**
```
draft → submit → pending_approval → approve → approved → send → sent
                          ↓
                       reject → rejected

approved → send → sent → confirm → confirmed → in_progress → receive → received

any (except received/cancelled) → cancel → cancelled
```

**Acciones de Orden:**
```http
POST /purchase-orders/{id}/submit     # Enviar a aprobación
POST /purchase-orders/{id}/approve    # Aprobar orden
POST /purchase-orders/{id}/reject     # Rechazar orden
POST /purchase-orders/{id}/send       # Enviar al proveedor
POST /purchase-orders/{id}/receive    # Marcar como recibida
POST /purchase-orders/{id}/cancel     # Cancelar orden
Authorization: Bearer <token>
```

**Estadísticas:**
```http
GET /purchase-orders/stats/overview
Authorization: Bearer <token>
```

---

## Sistema de Notificaciones

Base URL: `/notifications`

### Preferencias de Notificación

**Obtener preferencias:**
```http
GET /notifications/preferences
Authorization: Bearer <token>
```

**Actualizar preferencias:**
```http
PUT /notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "email_enabled": true,
  "push_enabled": true,
  "purchase_order_created": true,
  "purchase_order_approved": true,
  "purchase_order_received": true,
  "low_stock_alert": true,
  "email_frequency": "immediate"
}
```

### Gestión de Tokens Push

**Registrar token:**
```http
POST /notifications/register-push-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "ExponentPushToken[xxxxxxx]",
  "platform": "expo",
  "device_id": "device-uuid"
}
```

**Eliminar token:**
```http
DELETE /notifications/unregister-push-token?token={token}
Authorization: Bearer <token>
```

### Eventos de Notificación
- `purchase_order_created` - Orden creada
- `purchase_order_approved` - Orden aprobada
- `purchase_order_rejected` - Orden rechazada
- `purchase_order_sent` - Orden enviada
- `purchase_order_confirmed` - Orden confirmada
- `purchase_order_received` - Orden recibida
- `purchase_order_cancelled` - Orden cancelada
- `low_stock_alert` - Alerta de stock bajo
- `expiration_warning` - Warning de caducidad
- `payment_due_reminder` - Recordatorio de pago

---

## Sistema de Condiciones de Producto (Sprint 9)

Base URL: `/products/conditions`

**Nota:** Solo usuarios con rol Admin (1) o Super Admin (2) pueden gestionar condiciones.

### Endpoints de Condiciones

**Listar condiciones:**
```http
GET /products/conditions/?include_inactive=true
Authorization: Bearer <token>
```

**Crear condición:**
```http
POST /products/conditions/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Reacondicionado",
  "description": "Producto reacondicionado por el fabricante"
}
```

**Actualizar condición:**
```http
PUT /products/conditions/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nuevo Nombre",
  "is_active": false
}
```

**Eliminar condición (soft delete):**
```http
DELETE /products/conditions/{id}
Authorization: Bearer <token>
```

### Gestión de Lotes (Batches)

**Obtener lotes de producto:**
```http
GET /products/{product_id}/batches?skip=0&limit=100
Authorization: Bearer <token>
```

**Crear lote:**
```http
POST /products/{product_id}/batches
Authorization: Bearer <token>
Content-Type: application/json

{
  "batch_number": "LOTE-2024-001",
  "quantity": 100,
  "manufactured_date": "2024-01-15",
  "expiration_date": "2025-01-15"
}
```

**Nota:** Si `has_expiration=true` en el producto, `expiration_date` es requerido.

**Actualizar lote (incluye fechas):**
```http
PUT /products/batches/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "batch_number": "LOTE-2024-001-UPD",
  "quantity": 150,
  "manufactured_date": "2024-01-20",
  "expiration_date": "2025-01-20"
}
```

**Eliminar lote:**
```http
DELETE /products/batches/{id}
Authorization: Bearer <token>
```

**Nota:** Solo se pueden eliminar lotes con `quantity = 0`.

### Campos de Producto Actualizados (Sprint 9)

```json
{
  "id": 1,
  "sku": "SKU-001",
  "name": "Producto Ejemplo",
  "brand": "Marca X",
  "model": "Modelo Y",
  "condition_id": 1,
  "category_id": 1,
  "unit_id": 1,
  "has_batch": true,
  "has_expiration": true
}
```

---

## Notas Adicionales

- Todos los timestamps están en formato ISO 8601 (UTC)
- La paginación es 1-indexada (primera página = 1)
- Los movimientos se auto-aprueban para simplificar el flujo
- El stock se calcula a partir de las entradas del ledger
