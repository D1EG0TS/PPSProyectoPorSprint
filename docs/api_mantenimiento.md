# Documentación API: Mantenimiento Vehicular

## Base URL
`/api/v1`

## Autenticación
Todos los endpoints requieren token Bearer JWT en el header `Authorization`.

---

## 1. Tipos de Mantenimiento

### Listar Tipos
`GET /vehicles/maintenance/types`
- **Query Params:** `active_only=true`
- **Roles:** Todos (1-4)

### Crear Tipo
`POST /vehicles/maintenance/types`
- **Body:**
```json
{
  "name": "Cambio de Aceite",
  "code": "OIL-01",
  "category": "preventivo",
  "recommended_interval_months": 6,
  "recommended_interval_km": 10000
}
```
- **Roles:** Admin (1, 2)

---

## 2. Registros de Mantenimiento

### Historial por Vehículo
`GET /vehicles/maintenance/records/{vehicle_id}`
- **Response:** Lista de mantenimientos ordenados por fecha descendente.

### Crear Registro
`POST /vehicles/maintenance/records`
- **Body:**
```json
{
  "vehicle_id": 10,
  "maintenance_type_id": 5,
  "service_date": "2024-03-20",
  "odometer_at_service": 55000,
  "provider_name": "Taller Central",
  "status": "programado"
}
```
- **Roles:** Todos. (Rol 4 crea con estado `programado` forzoso).

### Agregar Parte a Mantenimiento
`POST /vehicles/maintenance/record/{record_id}/parts`
- **Body:**
```json
{
  "part_name": "Filtro Aceite",
  "product_id": 101,
  "warehouse_id": 1,
  "quantity": 1,
  "unit_cost": 150.00
}
```
- **Efecto:** Asocia la parte al registro. No descuenta stock aún.

### Completar Mantenimiento
`POST /vehicles/maintenance/record/{record_id}/complete`
- **Roles:** Admin, Supervisor (1, 2, 3).
- **Efecto Crítico:**
  1. Cambia estado a `completado`.
  2. Genera `MovementRequest` de salida (OUT) por cada almacén involucrado.
  3. Ejecuta `StockService.apply_movement` para descontar inventario real.
  4. Calcula y actualiza `next_recommended_date` y `next_recommended_odometer` en el registro.

---

## 3. Dashboard y Estadísticas

### Estadísticas Generales
`GET /vehicles/maintenance/dashboard/stats`
- **Response:** `DashboardStats`
```json
{
  "total_cost_month": 15000.0,
  "count_by_type": {"Preventivo": 10, "Correctivo": 2},
  "top_vehicles_cost": [...]
}
```

### Estadísticas por Vehículo
`GET /vehicles/maintenance/stats/{vehicle_id}`
- **Response:** Costo total histórico, desglose por estado.

---

## 4. Códigos de Error Comunes

- `403 Not enough permissions`: El usuario no tiene rol suficiente para la acción.
- `400 Bad Request`: Error de validación (ej. kilometraje menor al anterior).
- `404 Not Found`: Vehículo o registro no existe.
