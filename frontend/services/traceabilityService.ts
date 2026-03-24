import api from './api';

export interface TraceabilityRecord {
  id: number;
  product_id: number;
  batch_id?: number;
  warehouse_id: number;
  location_id: number;
  quantity: number;
  movement_type: string;
  reference_number: string;
  user_id: number;
  timestamp: string;
  notes?: string;
  product?: {
    id: number;
    sku: string;
    name: string;
  };
  batch?: {
    id: number;
    batch_number: string;
  };
  warehouse?: {
    id: number;
    name: string;
  };
  location?: {
    id: number;
    code: string;
    name: string;
  };
  user?: {
    id: number;
    full_name: string;
  };
}

export interface TraceabilityFilters {
  product_id?: number;
  batch_id?: number;
  warehouse_id?: number;
  start_date?: string;
  end_date?: string;
  movement_type?: string;
  reference_number?: string;
  skip?: number;
  limit?: number;
}

export const getTraceabilityRecords = async (filters?: TraceabilityFilters): Promise<TraceabilityRecord[]> => {
  const response = await api.get<TraceabilityRecord[]>('/tracking/records', { params: filters });
  return response.data;
};

export const getTraceabilityByProduct = async (productId: number): Promise<TraceabilityRecord[]> => {
  const response = await api.get<TraceabilityRecord[]>(`/tracking/product/${productId}`);
  return response.data;
};

export const getTraceabilityByBatch = async (batchId: number): Promise<TraceabilityRecord[]> => {
  const response = await api.get<TraceabilityRecord[]>(`/tracking/batch/${batchId}`);
  return response.data;
};

export const getTraceabilitySummary = async (productId?: number): Promise<{
  total_records: number;
  total_in: number;
  total_out: number;
  last_movement: TraceabilityRecord | null;
}> => {
  const response = await api.get('/tracking/summary', { params: { product_id: productId } });
  return response.data;
};
