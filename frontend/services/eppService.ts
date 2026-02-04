import api from './api';

export enum EPPStatus {
  AVAILABLE = "AVAILABLE",
  ASSIGNED = "ASSIGNED",
  EXPIRED = "EXPIRED",
  DAMAGED = "DAMAGED",
  REPLACED = "REPLACED",
  DISPOSED = "DISPOSED"
}

export interface ProductSummary {
  id: number;
  name: string;
  sku: string;
}

export interface EPP {
  id: number;
  product_id: number;
  product?: ProductSummary;
  serial_number?: string;
  size?: string;
  certification?: string;
  assignment_date?: string;
  expiration_date?: string;
  useful_life_days?: number;
  status: EPPStatus;
  assigned_to?: number;
  notes?: string;
  inspections?: Inspection[];
}

export interface EPPCreate {
  product_id: number;
  serial_number?: string;
  size?: string;
  certification?: string;
  useful_life_days?: number;
  notes?: string;
}

export interface Inspection {
  id: number;
  epp_id: number;
  inspection_date: string;
  inspector_id: number;
  passed: boolean;
  notes?: string;
  evidence_id?: string;
}

export interface InspectionCreate {
  passed: boolean;
  notes?: string;
  evidence_id?: string;
}

export const getEPPs = async (params?: { assigned_to?: number; status?: EPPStatus }) => {
  const response = await api.get<EPP[]>('/epp/', { params });
  return response.data;
};

export const createEPP = async (data: EPPCreate) => {
  const response = await api.post<EPP>('/epp/', data);
  return response.data;
};

export const assignEPP = async (id: number, userId: number) => {
  const response = await api.post<EPP>(`/epp/${id}/assign?user_id=${userId}`);
  return response.data;
};

export const getExpiringEPPs = async (days: number = 30) => {
  const response = await api.get<EPP[]>(`/epp/expiring?days=${days}`);
  return response.data;
};

export const inspectEPP = async (id: number, data: InspectionCreate) => {
  const response = await api.post<Inspection>(`/epp/${id}/inspect`, data);
  return response.data;
};

export const replaceEPP = async (id: number) => {
  const response = await api.post<EPP>(`/epp/${id}/replace`);
  return response.data;
};
