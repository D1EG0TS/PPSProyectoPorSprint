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
  APPLIED = 'APPLIED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MovementPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ItemPriority {
  URGENT = 'URGENT',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

export enum QualityStatus {
  PENDING_QC = 'PENDING_QC',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CONDITIONAL = 'CONDITIONAL',
}

export enum StorageCondition {
  AMBIENT = 'AMBIENT',
  REFRIGERATED = 'REFRIGERATED',
  FROZEN = 'FROZEN',
  HUMIDITY_CONTROLLED = 'HUMIDITY_CONTROLLED',
  HAZMAT = 'HAZMAT',
}

export enum TrackingEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELIVERED = 'DELIVERED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export interface MovementRequestItemCreate {
  product_id: number;
  batch_id?: number;
  quantity: number;
  notes?: string;
  source_location_id?: number;
  destination_location_id?: number;
  lot_number?: string;
  serial_number?: string;
  container_code?: string;
  priority?: ItemPriority;
  manufacturing_date?: string;
  expiry_date?: string;
  storage_conditions?: StorageCondition;
  quality_status?: QualityStatus;
  unit_cost?: number;
  status?: string;
}

export interface MovementRequestCreate {
  type: MovementType;
  source_warehouse_id?: number;
  destination_warehouse_id?: number;
  reason?: string;
  reference?: string;
  project_name?: string;
  project_code?: string;
  movement_purpose?: string;
  operator_notes?: string;
  priority?: MovementPriority;
  department?: string;
  cost_center?: string;
  items: MovementRequestItemCreate[];
}

export interface MovementRequestItem {
  id: number;
  request_id: number;
  product_id: number;
  batch_id?: number;
  quantity: number;
  quantity_delivered?: number;
  notes?: string;
  source_location_id?: number;
  destination_location_id?: number;
  lot_number?: string;
  serial_number?: string;
  container_code?: string;
  priority?: ItemPriority;
  product?: {
    id: number;
    sku: string;
    name: string;
    has_batch: boolean;
  };
}

export interface MovementRequest {
  id: number;
  request_number: string;
  type: MovementType;
  status: MovementStatus;
  requested_by: number;
  approved_by?: number;
  source_warehouse_id?: number;
  destination_warehouse_id?: number;
  reason?: string;
  reference?: string;
  project_name?: string;
  project_code?: string;
  movement_purpose?: string;
  operator_notes?: string;
  priority?: MovementPriority;
  department?: string;
  cost_center?: string;
  approval_notes?: string;
  created_at: string;
  updated_at?: string;
  actual_date?: string;
  items: MovementRequestItem[];
}

export interface MovementTrackingEvent {
  id: number;
  request_id: number;
  event_type: TrackingEventType;
  event_description?: string;
  location_name?: string;
  performed_by: number;
  performed_at: string;
  notes?: string;
}

export const createMovementRequest = async (data: MovementRequestCreate) => {
  const response = await api.post<MovementRequest>('/movements/requests/', data);
  return response.data;
};

export const updateMovementRequest = async (id: number, data: Partial<MovementRequestCreate>) => {
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
  type?: MovementType;
  priority?: MovementPriority;
}) => {
  const response = await api.get<MovementRequest[]>('/movements/requests/my', { params });
  return response.data;
};

export const getMovementRequests = async (params?: {
  skip?: number;
  limit?: number;
  status?: MovementStatus;
  type?: MovementType;
  warehouse_id?: number;
  priority?: MovementPriority;
}) => {
  const response = await api.get<MovementRequest[]>('/movements/requests/', { params });
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
  priority?: MovementPriority;
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

export const cancelMovementRequest = async (id: number, notes?: string) => {
  const response = await api.post<MovementRequest>(`/movements/requests/${id}/cancel`, { notes });
  return response.data;
};

export const applyMovementRequest = async (id: number) => {
  const response = await api.post<MovementRequest>(`/movements/requests/${id}/apply`);
  return response.data;
};

export const addTrackingEvent = async (id: number, event: {
  event_type: TrackingEventType;
  event_description?: string;
  location_name?: string;
  notes?: string;
}) => {
  const response = await api.post<MovementTrackingEvent>(`/movements/requests/${id}/tracking`, event);
  return response.data;
};

export const getTrackingEvents = async (id: number) => {
  const response = await api.get<MovementTrackingEvent[]>(`/movements/requests/${id}/tracking`);
  return response.data;
};

export const getMovementStock = async (params?: { product_id?: number; warehouse_id?: number }) => {
  const response = await api.get<{ stock: number }>('/movements/stock', { params });
  return response.data;
};
