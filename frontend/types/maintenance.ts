export enum MaintenanceCategory {
  PREVENTIVE = 'preventivo',
  CORRECTIVE = 'correctivo',
  PREDICTIVE = 'predictivo'
}

export enum MaintenanceStatus {
  SCHEDULED = 'programado',
  IN_PROGRESS = 'en_progreso',
  COMPLETED = 'completado',
  CANCELLED = 'cancelado'
}

export enum MaintenancePriority {
  LOW = 'baja',
  MEDIUM = 'media',
  HIGH = 'alta',
  CRITICAL = 'critica'
}

export interface MaintenanceType {
  id: number;
  code: string;
  name: string;
  description?: string;
  category: MaintenanceCategory;
  recommended_interval_km?: number;
  recommended_interval_months?: number;
  estimated_duration_hours?: number;
  is_active: boolean;
}

export interface MaintenancePart {
  id?: number;
  maintenance_id?: number;
  part_name: string;
  product_id?: number;
  warehouse_id?: number;
  part_number?: string;
  quantity: number;
  unit?: string;
  unit_cost?: number;
  total_cost?: number;
  supplier?: string;
  warranty_months?: number;
}

export interface MaintenanceAttachment {
  id?: number;
  maintenance_id?: number;
  filename: string;
  file_url: string;
  file_type?: string;
  description?: string;
  uploaded_by?: number;
}

export interface MaintenanceRecord {
  id: number;
  vehicle_id: number;
  maintenance_type_id: number;
  maintenance_type?: MaintenanceType;
  odometer_at_service?: number;
  service_date: string; // ISO Date string
  next_recommended_date?: string;
  next_recommended_odometer?: number;
  cost_amount?: number;
  cost_currency: string;
  provider_name?: string;
  provider_contact?: string;
  performed_by?: number;
  approved_by?: number;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  description?: string;
  notes?: string;
  requires_followup: boolean;
  followup_date?: string;
  created_at?: string;
  updated_at?: string;
  parts?: MaintenancePart[];
  attachments?: MaintenanceAttachment[];
}

export interface MaintenanceRecordCreate {
  vehicle_id: number;
  maintenance_type_id: number;
  odometer_at_service?: number;
  service_date: string;
  cost_amount?: number;
  cost_currency?: string;
  provider_name?: string;
  provider_contact?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  description?: string;
  notes?: string;
  requires_followup?: boolean;
  followup_date?: string;
  parts?: MaintenancePart[];
}

export interface MaintenanceRecordUpdate {
  odometer_at_service?: number;
  service_date?: string;
  cost_amount?: number;
  provider_name?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  description?: string;
  notes?: string;
  requires_followup?: boolean;
  followup_date?: string;
}

export interface UpcomingMaintenance {
  vehicle_id: number;
  vehicle_name: string;
  maintenance_type_name: string;
  due_date?: string;
  due_odometer?: number;
  days_remaining?: number;
  km_remaining?: number;
  priority: string;
}

export interface MaintenanceStats {
  vehicle_id: number;
  total_cost: number;
  total_records: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  status_breakdown: Record<string, number>;
}

export interface DashboardStats {
  total_cost_month: number;
  total_cost_year: number;
  count_by_type: Record<string, number>;
  count_by_status: Record<string, number>;
  monthly_costs: { month: string; cost: number }[];
  top_vehicles_cost: { vehicle_id: number; name: string; cost: number }[];
  avg_downtime_days: number;
}
