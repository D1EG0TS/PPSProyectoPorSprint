# Manual de Usuario: Gestión de Mantenimiento Vehicular

## 1. Introducción
Este módulo permite gestionar el ciclo de vida completo del mantenimiento de la flota vehicular, desde la programación de servicios preventivos hasta la atención de emergencias correctivas.

## 2. Acceso al Sistema
Para acceder al módulo de mantenimiento:
1. Inicie sesión en la aplicación.
2. Navegue al menú principal y seleccione **"Vehículos"**.
3. Seleccione un vehículo específico de la lista.
4. En el detalle del vehículo, pulse la pestaña **"Mantenimiento"**.

## 3. Registrar Mantenimiento Preventivo
El mantenimiento preventivo se planifica con antelación para evitar fallas.

### Pasos:
1. En la pantalla de Mantenimiento, pulse el botón **"+"** (Nuevo Registro).
2. Seleccione el **Tipo de Mantenimiento** (ej. Cambio de Aceite, Revisión 10k).
   - *Nota: El sistema sugerirá la fecha y kilometraje basado en el historial.*
3. Ingrese el **Kilometraje Actual** del vehículo.
4. Seleccione el **Proveedor/Taller** encargado.
5. Agregue notas adicionales si es necesario.
6. Pulse **"Guardar"**. El estado inicial será "Programado".

### Agregar Partes e Insumos:
1. Una vez creado el registro, pulse sobre él para ver el detalle.
2. Vaya a la sección **"Partes Utilizadas"**.
3. Pulse **"Agregar Parte"**.
4. Busque la refacción en el inventario (por nombre o código).
5. Indique la cantidad utilizada.
6. El sistema calculará el costo automáticamente y descontará del inventario al completar el servicio.

## 4. Reportar Mantenimiento Correctivo (Emergencias)
Para reportar una falla inesperada:

1. Cree un nuevo registro y seleccione un tipo de mantenimiento **Correctivo**.
2. Describa la falla en el campo **"Notas"** con el mayor detalle posible.
3. Si es una emergencia en ruta, indique la ubicación si el campo está disponible.
4. Guarde el registro. El estado será "Pendiente de Aprobación" o "En Progreso" según su rol.

## 5. Completar y Cerrar Mantenimiento
Una vez realizado el servicio:

1. Un usuario con permisos (Admin/Supervisor) debe revisar el registro.
2. Verifique los costos finales y las partes utilizadas.
3. Pulse el botón **"Completar"**.
4. **Importante:** Al completar, se descontarán automáticamente las partes del inventario y se actualizará el historial del vehículo para el cálculo del próximo servicio.

## 6. Calendario de Mantenimientos
Puede visualizar todos los mantenimientos programados en la vista de Calendario:
- Acceda desde la pantalla principal de Vehículos -> botón **"Calendario"**.
- Los eventos se muestran por fecha.
- Colores indican el estado: Azul (Programado), Verde (Completado), Rojo (Vencido).
