import api from './api';

export interface Product {
  id: number;
  sku: string;
  name: string;
  min_stock?: number;
  cost?: number;
}

export interface ScanResult {
  found: boolean;
  product_id: number | null;
  sku: string | null;
  barcode: string | null;
  name: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  unit: string | null;
  current_stock: number;
  min_stock: number;
  has_batch: boolean;
  has_expiration: boolean;
  locations: ProductLocationInfo[];
}

export interface ProductLocationInfo {
  location_id: number;
  location_code: string;
  warehouse_name: string;
  quantity: number;
  batch_number: string | null;
  expiration_date: string | null;
  is_primary: boolean;
}

export interface ReceiveItem {
  product_id: number;
  quantity: number;
  batch_number?: string;
  expiration_date?: string;
  location_id?: number;
}

export interface ReceiveRequest {
  warehouse_id: number;
  items: ReceiveItem[];
  reference?: string;
  notes?: string;
}

export interface ReceiveResponse {
  success: boolean;
  movement_request_id: number;
  request_number: string;
  items_received: number;
  message: string;
}

export interface LocationCapacity {
  id: number;
  code: string;
  name: string;
  capacity: number;
  current_occupancy: number;
  available: number;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  location: string;
}

export interface AvailableLocation {
  id: number;
  code: string;
  name: string;
  path: string;
  capacity: number | null;
  current_occupancy: number;
  available: number;
  has_capacity: boolean;
}

export type AdjustmentReason = 'RECOUNT' | 'DAMAGE' | 'THEFT' | 'EXPIRED' | 'CORRECTION' | 'OTHER';

export interface AdjustmentItem {
  product_id: number;
  warehouse_id: number;
  location_id?: number;
  quantity: number;
  reason: AdjustmentReason;
  notes?: string;
}

export interface AdjustmentRequest {
  items: AdjustmentItem[];
  reference?: string;
}

export interface AdjustmentResponse {
  success: boolean;
  movement_request_id: number;
  request_number: string;
  adjustments_count: number;
  message: string;
}

export interface AdjustmentHistoryItem {
  id: number;
  request_number: string;
  product_id: number;
  product_name: string;
  product_sku: string;
  warehouse_id: number;
  warehouse_name: string;
  location_code: string | null;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  notes: string | null;
  adjusted_by: number;
  adjusted_by_name: string;
  created_at: string;
}

export interface AdjustmentHistoryResponse {
  adjustments: AdjustmentHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface TransferItem {
  product_id: number;
  quantity: number;
  source_location_id?: number;
  destination_location_id?: number;
  batch_number?: string;
}

export interface TransferRequest {
  source_warehouse_id: number;
  destination_warehouse_id: number;
  items: TransferItem[];
  reference?: string;
  notes?: string;
}

export interface TransferResponse {
  success: boolean;
  movement_request_id: number;
  request_number: string;
  items_transferred: number;
  message: string;
}

export interface TransferHistoryItem {
  id: number;
  request_number: string;
  product_id: number;
  product_name: string;
  product_sku: string;
  source_warehouse_id: number;
  source_warehouse_name: string;
  destination_warehouse_id: number;
  destination_warehouse_name: string;
  source_location_code: string | null;
  destination_location_code: string | null;
  quantity: number;
  notes: string | null;
  transferred_by: number;
  transferred_by_name: string;
  created_at: string;
}

export interface TransferHistoryResponse {
  transfers: TransferHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export const inventoryService = {
  scan: async (code: string, warehouseId?: number): Promise<ScanResult> => {
    const params: any = {};
    if (warehouseId) params.warehouse_id = warehouseId;
    const response = await api.post<ScanResult>('/inventory/scan', { code }, { params });
    return response.data;
  },

  receive: async (request: ReceiveRequest): Promise<ReceiveResponse> => {
    const response = await api.post<ReceiveResponse>('/inventory/receive', request);
    return response.data;
  },

  getWarehouses: async (): Promise<Warehouse[]> => {
    const response = await api.get<Warehouse[]>('/inventory/warehouses');
    return response.data;
  },

  getAvailableLocations: async (warehouseId: number): Promise<AvailableLocation[]> => {
    const response = await api.get<AvailableLocation[]>('/inventory/locations/available', {
      params: { warehouse_id: warehouseId }
    });
    return response.data;
  },

  getLocationCapacity: async (locationId: number): Promise<LocationCapacity> => {
    const response = await api.get<LocationCapacity>(`/inventory/locations/${locationId}/capacity`);
    return response.data;
  },

  updateLocationCapacity: async (locationId: number, capacity: number): Promise<LocationCapacity> => {
    const response = await api.put<LocationCapacity>(`/inventory/locations/${locationId}/capacity`, { capacity });
    return response.data;
  },

  getProductLocations: async (productId: number, warehouseId?: number): Promise<ProductLocationInfo[]> => {
    const params: any = {};
    if (warehouseId) params.warehouse_id = warehouseId;
    const response = await api.get<ProductLocationInfo[]>(`/inventory/product/${productId}/locations`, { params });
    return response.data;
  },

  adjust: async (request: AdjustmentRequest): Promise<AdjustmentResponse> => {
    const response = await api.post<AdjustmentResponse>('/inventory/adjust', request);
    return response.data;
  },

  getAdjustmentHistory: async (params?: {
    product_id?: number;
    warehouse_id?: number;
    reason?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<AdjustmentHistoryResponse> => {
    const response = await api.get<AdjustmentHistoryResponse>('/inventory/adjustments', { params });
    return response.data;
  },

  transfer: async (request: TransferRequest): Promise<TransferResponse> => {
    const response = await api.post<TransferResponse>('/inventory/transfer', request);
    return response.data;
  },

  getTransferHistory: async (params?: {
    product_id?: number;
    source_warehouse_id?: number;
    destination_warehouse_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<TransferHistoryResponse> => {
    const response = await api.get<TransferHistoryResponse>('/inventory/transfers', { params });
    return response.data;
  },

  // Cycle Count Methods
  createCycleCount: async (request: {
    warehouse_id: number;
    location_ids?: number[];
    product_ids?: number[];
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
    notes?: string;
  }): Promise<any> => {
    const response = await api.post('/inventory/cycle-count', request);
    return response.data;
  },

  getCycleCounts: async (params?: {
    warehouse_id?: number;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    counts: any[];
    total: number;
    page: number;
    page_size: number;
  }> => {
    const response = await api.get('/inventory/cycle-count', { params });
    return response.data;
  },

  getCycleCountDetail: async (countId: number): Promise<any> => {
    const response = await api.get(`/inventory/cycle-count/${countId}`);
    return response.data;
  },

  recordCycleCount: async (countId: number, itemId: number, countedStock: number, notes?: string): Promise<any> => {
    const response = await api.post(`/inventory/cycle-count/${countId}/record`, {
      item_id: itemId,
      counted_stock: countedStock,
      notes
    });
    return response.data;
  },

  completeCycleCount: async (countId: number): Promise<any> => {
    const response = await api.post(`/inventory/cycle-count/${countId}/complete`);
    return response.data;
  },

  approveVariances: async (countId: number, approvals: Array<{
    item_id: number;
    approve: boolean;
    apply_adjustment?: boolean;
    notes?: string;
  }>): Promise<any> => {
    const response = await api.post(`/inventory/cycle-count/${countId}/approve-variances`, {
      approvals
    });
    return response.data;
  },

  // Report Methods
  getExpiringProducts: async (params?: {
    warehouse_id?: number;
    days_ahead?: number;
    include_expired?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    products: ExpiringProductItem[];
    total: number;
    expired_count: number;
    expiring_soon_count: number;
  }> => {
    const response = await api.get('/inventory/reports/expiring', { params });
    return response.data;
  },

  getLowStockProducts: async (params?: {
    warehouse_id?: number;
    page?: number;
    page_size?: number;
  }): Promise<{
    products: LowStockItem[];
    total: number;
    critical_count: number;
    warning_count: number;
  }> => {
    const response = await api.get('/inventory/reports/low-stock', { params });
    return response.data;
  },

  getInventorySummary: async (params?: {
    warehouse_id?: number;
  }): Promise<InventorySummaryResponse> => {
    const response = await api.get('/inventory/reports/summary', { params });
    return response.data;
  },
};

// Report Interfaces
export interface ExpiringProductItem {
  product_id: number;
  product_name: string;
  product_sku: string;
  batch_number: string | null;
  warehouse_name: string;
  location_code: string | null;
  quantity: number;
  expiration_date: string;
  days_until_expiry: number;
  is_expired: boolean;
}

export interface LowStockItem {
  product_id: number;
  product_name: string;
  product_sku: string;
  category: string | null;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  stock_percentage: number;
  warehouse_name: string | null;
  last_updated: string | null;
}

export interface InventorySummaryCategory {
  category_id: number | null;
  category_name: string;
  total_products: number;
  total_stock: number;
  total_value: number | null;
}

export interface InventorySummaryWarehouse {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  total_products: number;
  total_stock: number;
  low_stock_count: number;
  expiring_soon_count: number;
}

export interface InventorySummaryResponse {
  total_products: number;
  total_stock: number;
  total_value: number | null;
  low_stock_count: number;
  expiring_soon_count: number;
  out_of_stock_count: number;
  by_category: InventorySummaryCategory[];
  by_warehouse: InventorySummaryWarehouse[];
}
