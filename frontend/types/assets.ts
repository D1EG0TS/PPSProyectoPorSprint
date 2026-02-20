export enum AssetType {
    HERRAMIENTA = 'herramienta',
    EQUIPO_MEDICION = 'equipo_medicion',
    ACTIVO_INFORMATICO = 'activo_informatico'
}

export enum AssetStatus {
    DISPONIBLE = 'disponible',
    ASIGNADO = 'asignado',
    EN_MANTENIMIENTO = 'en_mantenimiento',
    EN_REPARACION = 'en_reparacion',
    EN_CALIBRACION = 'en_calibracion',
    BAJA = 'baja',
    EXTRAVIADO = 'extraviado'
}

export enum AssetCondition {
    NUEVO = 'nuevo',
    EXCELENTE = 'excelente',
    BUENO = 'bueno',
    REGULAR = 'regular',
    MALO = 'malo',
    NO_OPERATIVO = 'no_operativo'
}

export enum AttributeType {
    TEXTO = 'texto',
    NUMERO = 'numero',
    BOOLEANO = 'booleano',
    FECHA = 'fecha'
}

export enum MaintenanceType {
    PREVENTIVO = 'preventivo',
    CORRECTIVO = 'correctivo',
    PREDICTIVO = 'predictivo'
}

export enum MaintenanceStatus {
    PROGRAMADO = 'programado',
    EN_PROCESO = 'en_proceso',
    COMPLETADO = 'completado',
    CANCELADO = 'cancelado'
}

export enum CalibrationStatus {
    VIGENTE = 'vigente',
    PROXIMO_A_VENCER = 'proximo_a_vencer',
    VENCIDO = 'vencido',
    EN_PROCESO = 'en_proceso'
}

export enum AssetAction {
    CREADO = 'creado',
    ASIGNADO = 'asignado',
    DEVUELTO = 'devuelto'
}

export enum DepreciationMethod {
    LINEAL = 'lineal',
    ACELERADA = 'acelerada',
    NONE = 'none'
}

export interface AssetCategory {
    id: number;
    code: string;
    name: string;
    asset_type: AssetType;
    requires_calibration: boolean;
    requires_maintenance: boolean;
    depreciable: boolean;
    useful_life_months?: number;
    depreciation_method: DepreciationMethod;
}

export interface AssetAttribute {
    id: number;
    asset_id: number;
    attribute_name: string;
    attribute_value: string;
    attribute_type: AttributeType;
}

export interface AssetAttributeCreate {
    attribute_name: string;
    attribute_value: string;
    attribute_type: AttributeType;
}

export interface AssetMaintenance {
    id: number;
    asset_id: number;
    maintenance_type: MaintenanceType;
    service_date: string; // ISO Date
    completion_date?: string; // ISO Date
    description?: string;
    technician?: string;
    cost?: number;
    invoice_number?: string;
    next_maintenance_date?: string; // ISO Date
    status: MaintenanceStatus;
    notes?: string;
    performed_by?: number;
    approved_by?: number;
    attachments?: any[];
}

export interface AssetCalibration {
    id: number;
    asset_id: number;
    calibration_date: string; // ISO Date
    expiration_date?: string; // ISO Date
    certificate_number?: string;
    calibration_lab?: string;
    standard_used?: string;
    results?: any;
    deviation?: number;
    tolerance?: number;
    passed: boolean;
    adjusted: boolean;
    cost?: number;
    certificate_url?: string;
    next_calibration_date?: string;
    status: CalibrationStatus;
    performed_by?: number;
}

export interface AssetAssignment {
    id: number;
    asset_id: number;
    assigned_to: number;
    assigned_by?: number;
    assignment_date: string; // ISO DateTime
    expected_return_date?: string; // ISO Date
    return_date?: string; // ISO DateTime
    condition_out?: string;
    condition_in?: string;
    purpose?: string;
    request_id?: number;
    status: string; // 'activa' | 'devuelta' | 'vencida'
}

export interface Asset {
    id: number;
    asset_tag: string;
    category_id: number;
    name: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    barcode?: string;
    acquisition_date?: string; // ISO Date
    acquisition_cost?: number;
    current_value?: number;
    supplier?: string;
    invoice_number?: string;
    warranty_expiration?: string; // ISO Date
    location_id?: number;
    warehouse_id?: number;
    responsible_user_id?: number;
    status: AssetStatus;
    condition: AssetCondition;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    
    // Relationships (simplified for frontend)
    category?: AssetCategory;
    attributes?: AssetAttribute[];
    maintenance_records?: AssetMaintenance[];
    calibration_records?: AssetCalibration[];
    assignments?: AssetAssignment[];
}

export interface AssetCreate {
    asset_tag?: string;
    category_id: number;
    name: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    barcode?: string;
    acquisition_date?: string;
    acquisition_cost?: number;
    supplier?: string;
    invoice_number?: string;
    warranty_expiration?: string;
    location_id?: number;
    warehouse_id?: number;
    responsible_user_id?: number;
    status: AssetStatus;
    condition: AssetCondition;
    notes?: string;
    attributes?: AssetAttributeCreate[];
}

export interface AssetUpdate {
    name?: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    barcode?: string;
    acquisition_date?: string;
    acquisition_cost?: number;
    supplier?: string;
    invoice_number?: string;
    warranty_expiration?: string;
    location_id?: number;
    warehouse_id?: number;
    responsible_user_id?: number;
    status?: AssetStatus;
    condition?: AssetCondition;
    notes?: string;
    attributes?: AssetAttributeCreate[];
}
