# Guía de Administración: Módulo de Mantenimiento

## 1. Configuración de Tipos de Mantenimiento
El sistema se basa en "Tipos de Mantenimiento" predefinidos para estandarizar los servicios y automatizar recordatorios.

### Crear un Tipo de Mantenimiento:
1. Acceda al Panel de Administración -> Mantenimiento -> Tipos.
2. Defina:
   - **Nombre:** (ej. "Servicio Mayor 50k")
   - **Categoría:** Preventivo o Correctivo.
   - **Intervalo Sugerido (Meses):** Frecuencia temporal (ej. 6 meses).
   - **Intervalo Sugerido (Km):** Frecuencia por uso (ej. 10,000 km).
3. Guarde la configuración.

*El sistema utilizará estos intervalos para calcular automáticamente la fecha y kilometraje del próximo servicio al completar una orden.*

## 2. Gestión de Aprobaciones
Para controlar los costos, el sistema implementa niveles de aprobación:
- **Operador:** Solo puede crear solicitudes.
- **Supervisor (Rol 3):** Puede aprobar mantenimientos hasta $5,000.
- **Admin (Rol 1/2):** Aprobación ilimitada.

Si un supervisor intenta aprobar un costo superior a su límite, el sistema bloqueará la acción y requerirá intervención de un administrador.

## 3. Catálogo de Partes y Precios
El módulo de mantenimiento se integra con el Inventario.
- Asegúrese de que las refacciones estén dadas de alta en el catálogo de productos con la categoría correcta.
- Mantenga actualizados los costos unitarios en el inventario, ya que estos se utilizan para calcular el costo total del mantenimiento.

## 4. Dashboard y Reportes
Acceda al Dashboard de Mantenimiento para monitorear KPIs:
- **Costos Mensuales:** Monitoree la tendencia de gasto.
- **Top Vehículos Costosos:** Identifique unidades que requieren reemplazo o revisión mayor.
- **Distribución Preventivo vs Correctivo:** Un radio saludable debe favorecer lo preventivo (ej. 80/20).

## 5. Alertas Automáticas
El sistema genera alertas basadas en:
- Fecha de próximo servicio vencida.
- Kilometraje actual > Kilometraje recomendado.
- Mantenimientos en estado "Programado" por más de 30 días sin atención.
