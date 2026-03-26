import api from './api';

export type PurchaseOrderStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'confirmed' | 'in_progress' | 'partially_received' | 'received' | 'cancelled' | 'rejected';
export type PurchaseOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number | null;
  product_sku: string | null;
  product_name: string;
  quantity: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  notes: string | null;
  status: string;
  created_at: number;
  updated_at: number | null;
}

export interface PurchaseOrder {
  id: number;
  order_number: string;
  supplier_id: number;
  status: PurchaseOrderStatus;
  priority: PurchaseOrderPriority;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  currency: string;
  exchange_rate: number;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  notes: string | null;
  internal_notes: string | null;
  approved_by: number | null;
  approved_at: number | null;
  sent_at: number | null;
  confirmed_at: number | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: number;
  updated_at: number | null;
  is_active: boolean;
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderItemRequest {
  product_id?: number;
  product_sku?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  expected_delivery_date?: string;
  notes?: string;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: number;
  priority?: PurchaseOrderPriority;
  expected_delivery_date?: string;
  shipping_address?: string;
  billing_address?: string;
  notes?: string;
  internal_notes?: string;
  currency?: string;
  exchange_rate?: number;
  shipping_cost?: number;
  items: CreatePurchaseOrderItemRequest[];
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: number;
  priority?: PurchaseOrderPriority;
  status?: PurchaseOrderStatus;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  shipping_address?: string;
  billing_address?: string;
  notes?: string;
  internal_notes?: string;
  shipping_cost?: number;
  approved_by?: number;
  approved_at?: number;
}

export interface PurchaseOrderStats {
  total_orders: number;
  draft_orders: number;
  pending_orders: number;
  approved_orders: number;
  received_orders: number;
  cancelled_orders: number;
  total_amount: number;
  pending_amount: number;
}

export const purchaseOrderService = {
  list: async (params?: {
    skip?: number;
    limit?: number;
    supplier_id?: number;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<{ total: number; orders: PurchaseOrder[] }> => {
    const response = await api.get('/purchase-orders/', { params });
    return response.data;
  },

  get: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  },

  create: async (data: CreatePurchaseOrderRequest): Promise<PurchaseOrder> => {
    const response = await api.post('/purchase-orders/', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePurchaseOrderRequest): Promise<PurchaseOrder> => {
    const response = await api.put(`/purchase-orders/${id}`, data);
    return response.data;
  },

  submit: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase-orders/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase-orders/${id}/approve`);
    return response.data;
  },

  reject: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase-orders/${id}/reject`);
    return response.data;
  },

  send: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase-orders/${id}/send`);
    return response.data;
  },

  receive: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase-orders/${id}/receive`);
    return response.data;
  },

  cancel: async (id: number): Promise<PurchaseOrder> => {
    const response = await api.post(`/purchase-orders/${id}/cancel`);
    return response.data;
  },

  getStats: async (): Promise<PurchaseOrderStats> => {
    const response = await api.get('/purchase-orders/stats/overview');
    return response.data;
  },
};
