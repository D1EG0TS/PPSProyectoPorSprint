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

## Notas Adicionales

- Todos los timestamps están en formato ISO 8601 (UTC)
- La paginación es 1-indexada (primera página = 1)
- Los movimientos se auto-aprueban para simplificar el flujo
- El stock se calcula a partir de las entradas del ledger
