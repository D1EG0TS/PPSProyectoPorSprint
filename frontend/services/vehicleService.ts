import api from './api';

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
}

export enum DocumentType {
  INSURANCE = 'INSURANCE',
  VERIFICATION = 'VERIFICATION',
  TENURE = 'TENURE',
  CIRCULATION_CARD = 'CIRCULATION_CARD',
  OTHER = 'OTHER',
}

export interface VehicleDocument {
  id: number;
  vehicle_id: number;
  document_type: DocumentType;
  expiration_date?: string;
  verified: boolean;
  verified_by?: number;
  evidence_id?: string;
}

export interface VehicleMaintenance {
  id: number;
  vehicle_id: number;
  maintenance_type: MaintenanceType;
  date: string;
  provider?: string;
  cost?: number;
  odometer?: number;
  description?: string;
  evidence_id?: string;
}

export interface Vehicle {
  id: number;
  vin: string;
  license_plate: string;
  brand: string;
  model: string;
  year: number;
  odometer: number;
  status: VehicleStatus;
  assigned_to?: number;
  insurance_policy?: string;
  insurance_expiration?: string;
  maintenances?: VehicleMaintenance[];
  documents?: VehicleDocument[];
}

export interface VehicleCreate {
  vin: string;
  license_plate: string;
  brand: string;
  model: string;
  year: number;
  odometer?: number;
  status?: VehicleStatus;
  assigned_to?: number;
  insurance_policy?: string;
  insurance_expiration?: string;
}

export interface VehicleUpdate {
  vin?: string;
  license_plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  odometer?: number;
  status?: VehicleStatus;
  assigned_to?: number;
  insurance_policy?: string;
  insurance_expiration?: string;
}

export interface MaintenanceCreate {
  maintenance_type: MaintenanceType;
  date: string;
  provider?: string;
  cost?: number;
  odometer?: number;
  description?: string;
  evidence_id?: string;
}

export interface DocumentCreate {
  document_type: DocumentType;
  expiration_date?: string;
  evidence_id?: string;
}

export interface DocumentValidate {
  verified: boolean;
  evidence_id?: string;
}

const vehicleService = {
  getAll: async (params?: { status?: VehicleStatus; assigned_to?: number }) => {
    const response = await api.get<Vehicle[]>('/vehicles/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Vehicle>(`/vehicles/${id}`);
    return response.data;
  },

  create: async (data: VehicleCreate) => {
    const response = await api.post<Vehicle>('/vehicles/', data);
    return response.data;
  },

  update: async (id: number, data: VehicleUpdate) => {
    const response = await api.put<Vehicle>(`/vehicles/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/vehicles/${id}`);
  },

  addMaintenance: async (vehicleId: number, data: MaintenanceCreate) => {
    const response = await api.post<VehicleMaintenance>(`/vehicles/${vehicleId}/maintenances`, data);
    return response.data;
  },

  addDocument: async (vehicleId: number, data: DocumentCreate) => {
    const response = await api.post<VehicleDocument>(`/vehicles/${vehicleId}/documents`, data);
    return response.data;
  },

  validateDocument: async (docId: number, data: DocumentValidate) => {
    const response = await api.post<VehicleDocument>(`/vehicles/documents/${docId}/validate`, data);
    return response.data;
  },
};

export default vehicleService;
