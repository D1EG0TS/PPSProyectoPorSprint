import api from './api';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum MovementStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface MovementRequestItemCreate {
  product_id: number;
  batch_id?: number;
  quantity: number;
  notes?: string;
}

export interface MovementRequestCreate {
  type: MovementType;
  source_warehouse_id?: number;
  destination_warehouse_id?: number;
  reason?: string;
  reference?: string;
  items: MovementRequestItemCreate[];
}

export interface MovementRequestItem {
  id: number;
  request_id: number;
  product_id: number;
  batch_id?: number;
  quantity: number;
  notes?: string;
  product?: {
    id: number;
    sku: string;
    name: string;
    has_batch: boolean;
  };
  batch?: {
    id: number;
    batch_number: string;
  };
}

export interface MovementRequest {
  id: number;
  type: MovementType;
  status: MovementStatus;
  requested_by: number;
  approved_by?: number;
  source_warehouse_id?: number;
  destination_warehouse_id?: number;
  reason?: string;
  reference?: string;
  approval_notes?: string;
  created_at: string;
  updated_at?: string;
  items: MovementRequestItem[];
}

export interface MovementRequestUpdate {
  status?: MovementStatus;
  reason?: string;
  reference?: string;
}

export const createMovementRequest = async (data: MovementRequestCreate) => {
  const response = await api.post<MovementRequest>('/movements/requests/', data);
  return response.data;
};

export const updateMovementRequest = async (id: number, data: MovementRequestUpdate) => {
  const response = await api.put<MovementRequest>(`/movements/requests/${id}`, data);
  return response.data;
};

export const submitMovementRequest = async (id: number) => {
  const response = await api.post<MovementRequest>(`/movements/requests/${id}/submit`);
  return response.data;
};

export const getMyMovementRequests = async (params?: {
  skip?: number;
  limit?: number;
  status?: MovementStatus;
}) => {
  const response = await api.get<MovementRequest[]>('/movements/requests/my', { params });
  return response.data;
};

export const getMovementRequestById = async (id: number) => {
  const response = await api.get<MovementRequest>(`/movements/requests/${id}`);
  return response.data;
};

export const getPendingMovementRequests = async (params?: {
  skip?: number;
  limit?: number;
  type?: MovementType;
  warehouse_id?: number;
  start_date?: string;
  end_date?: string;
}) => {
  const response = await api.get<MovementRequest[]>('/movements/requests/pending', { params });
  return response.data;
};

export const approveMovementRequest = async (id: number, notes?: string) => {
  const response = await api.post<MovementRequest>(`/movements/requests/${id}/approve`, { notes });
  return response.data;
};

export const rejectMovementRequest = async (id: number, notes?: string) => {
  const response = await api.post<MovementRequest>(`/movements/requests/${id}/reject`, { notes });
  return response.data;
};

export const applyMovementRequest = async (id: number) => {
  const response = await api.post<MovementRequest>(`/movements/requests/${id}/apply`);
  return response.data;
};

export const getMovementStock = async (params?: { product_id?: number; warehouse_id?: number }) => {
  const response = await api.get<{ stock: number }>('/movements/stock', { params });
  return response.data;
};
