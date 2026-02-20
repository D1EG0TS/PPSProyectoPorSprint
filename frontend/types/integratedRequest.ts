export enum IntegratedRequestPurpose {
    PROYECTO = 'PROYECTO',
    MANTENIMIENTO = 'MANTENIMIENTO',
    OBRA = 'OBRA',
    EMERGENCIA = 'EMERGENCIA',
    OTRO = 'OTRO'
}

export enum IntegratedRequestStatus {
    BORRADOR = 'BORRADOR',
    PENDIENTE = 'PENDIENTE',
    APROBADA = 'APROBADA',
    RECHAZADA = 'RECHAZADA',
    ENTREGADA = 'ENTREGADA',
    PARCIAL_DEVUELTA = 'PARCIAL_DEVUELTA',
    COMPLETADA = 'COMPLETADA'
}

export enum EmergencyLevel {
    NORMAL = 'NORMAL',
    URGENTE = 'URGENTE',
    CRITICA = 'CRITICA'
}

export enum RequestItemStatus {
    PENDIENTE = 'PENDIENTE',
    APROBADO = 'APROBADO',
    ENTREGADO = 'ENTREGADO',
    EN_DEVOLUCION = 'EN_DEVOLUCION',
    DEVUELTO_PARCIAL = 'DEVUELTO_PARCIAL',
    CONSUMIDO = 'CONSUMIDO'
}

export enum RequestToolStatus {
    PENDIENTE = 'PENDIENTE',
    PRESTADA = 'PRESTADA',
    EN_DEVOLUCION = 'EN_DEVOLUCION',
    DEVUELTA = 'DEVUELTA',
    DANADA = 'DANADA',
    PERDIDA = 'PERDIDA'
}

export enum RequestEPPStatus {
    PENDIENTE = 'PENDIENTE',
    ASIGNADO = 'ASIGNADO',
    ENTREGADO = 'ENTREGADO',
    EN_DEVOLUCION = 'EN_DEVOLUCION',
    DEVUELTO = 'DEVUELTO',
    CADUCADO = 'CADUCADO',
    DANADO = 'DANADO'
}

export enum RequestVehicleStatus {
    PENDIENTE = 'PENDIENTE',
    ASIGNADO = 'ASIGNADO',
    EN_USO = 'EN_USO',
    EN_DEVOLUCION = 'EN_DEVOLUCION',
    DEVUELTO = 'DEVUELTO',
    CON_INCIDENTE = 'CON_INCIDENTE'
}

export enum FuelLevel {
    LEVEL_0_25 = 'LEVEL_0_25',
    LEVEL_25_50 = 'LEVEL_25_50',
    LEVEL_50_75 = 'LEVEL_50_75',
    LEVEL_75_100 = 'LEVEL_75_100'
}

export interface RequestItem {
    id: number;
    request_id: number;
    product_id: number;
    batch_id?: number;
    quantity_requested: number;
    quantity_approved: number;
    quantity_delivered: number;
    quantity_returned: number;
    purpose?: string;
    status: RequestItemStatus;
    notes?: string;
    product?: any; // To be populated with Product type
}

export interface RequestTool {
    id: number;
    request_id: number;
    tool_id: number;
    assigned_to?: number;
    expected_return_date?: string;
    condition_out?: string;
    condition_in?: string;
    checked_out_at?: string;
    checked_in_at?: string;
    status: RequestToolStatus;
    damage_notes?: string;
    penalty_applied: boolean;
    tool?: any; // To be populated with Tool type
}

export interface RequestEPP {
    id: number;
    request_id: number;
    epp_id: number;
    assigned_to?: number;
    expected_return_date?: string;
    checkout_date?: string;
    checkin_date?: string;
    condition_out?: string;
    condition_in?: string;
    status: RequestEPPStatus;
    inspection_notes?: string;
    epp?: any; // To be populated with EPP type
}

export interface RequestVehicle {
    id: number;
    request_id: number;
    vehicle_id: number;
    assigned_to?: number;
    odometer_out?: number;
    odometer_in?: number;
    fuel_level_out?: FuelLevel;
    fuel_level_in?: FuelLevel;
    checkout_date?: string;
    checkin_date?: string;
    status: RequestVehicleStatus;
    incident_report?: string;
    return_notes?: string;
    vehicle?: any; // To be populated with Vehicle type
}

export interface IntegratedRequest {
    id: number;
    request_number: string;
    requested_by: number;
    purpose: IntegratedRequestPurpose;
    project_code?: string;
    expected_return_date?: string;
    status: IntegratedRequestStatus;
    approved_by?: number;
    approved_at?: string;
    delivered_by?: number;
    delivered_at?: string;
    notes?: string;
    emergency_level: EmergencyLevel;
    created_at: string;
    updated_at?: string;
    items: RequestItem[];
    tools: RequestTool[];
    epp_items: RequestEPP[];
    vehicles: RequestVehicle[];
    requester?: any; // User type
}

export interface IntegratedRequestCreate {
    purpose: IntegratedRequestPurpose;
    project_code?: string;
    expected_return_date?: string;
    notes?: string;
    emergency_level?: EmergencyLevel;
}

export interface RequestItemCreate {
    product_id: number;
    quantity_requested: number;
    purpose?: string;
    notes?: string;
}

export interface RequestToolCreate {
    tool_id: number;
    assigned_to?: number;
    expected_return_date?: string;
}

export interface RequestEPPCreate {
    epp_id: number;
    assigned_to?: number;
    expected_return_date?: string;
}

export interface RequestVehicleCreate {
    vehicle_id: number;
    assigned_to?: number;
}
