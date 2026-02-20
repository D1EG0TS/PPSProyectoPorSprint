# Manual de Usuario: Módulo de Activos y Equipos Especializados

## 1. Introducción
Este módulo permite la gestión integral del ciclo de vida de los activos de la empresa, incluyendo equipos de medición, activos informáticos y herramientas especializadas.

## 2. Acceso y Navegación
- **Menú Principal**: Seleccione "Activos" en el menú lateral.
- **Dashboard**: Vista general con KPIs, alertas de calibración y vencimientos de garantía.
- **Inventario**: Listado completo con filtros por categoría y estado.

## 3. Gestión de Activos
### 3.1 Crear Nuevo Activo
1. Navegue a **Inventario > Nuevo Activo**.
2. Seleccione la categoría (ej. Multímetro, Laptop).
3. Complete los datos obligatorios: Nombre, Costo, Fecha Adquisición.
4. (Opcional) Agregue atributos específicos como precisión o rango.

### 3.2 Asignación
- Desde el detalle del activo, use el botón **Asignar**.
- Seleccione el usuario responsable y el propósito.
- El estado cambiará a "Asignado".

### 3.3 Devolución
- Use el botón **Devolver** en el detalle del activo.
- Indique la condición de retorno (Bueno, Regular, Malo).

## 4. Mantenimiento y Calibración
### 4.1 Registrar Calibración
- Solo para equipos de medición.
- Ingrese fecha, laboratorio y resultado (Pasa/Falla).
- Si falla, el equipo puede marcarse automáticamente como "No Operativo".

### 4.2 Mantenimiento
- Registre mantenimientos preventivos o correctivos.
- Incluya costos para el cálculo de historial financiero.

## 5. Reportes
- **Calibración**: Equipos próximos a vencer.
- **Valorización**: Depreciación acumulada.
- **Utilización**: Tasa de uso de activos.

---

# Manual de Administrador

## 1. Configuración Inicial
- **Categorías**: Definir códigos (ej. "IT-LAPTOP") y tipos de activo.
- **Usuarios**: Asignar roles (Admin, Moderador, Operativo) para control de acceso.

## 2. Tareas Automatizadas
- El sistema ejecuta chequeos diarios a las 00:00.
- **Alertas**:
  - Calibración: 30, 15 y 7 días antes del vencimiento.
  - Garantía: 30 días antes.
- **Endpoint Manual**: `POST /api/v1/assets/run-daily-checks` (Solo Super Admin).

## 3. Solución de Problemas
- **No se generan alertas**: Verifique que el cron job o tarea programada esté llamando al endpoint diario.
- **Error en depreciación**: Confirme que el activo tiene `acquisition_cost` y `acquisition_date`.

## 4. Auditoría
- Todos los cambios de estado y asignaciones quedan registrados en el log de auditoría del activo.
