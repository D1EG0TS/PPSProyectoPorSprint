import api from './api';

export type SupplierStatus = 'active' | 'inactive' | 'pending' | 'blocked';
export type SupplierCategory = 'raw_materials' | 'finished_goods' | 'equipment' | 'services' | 'packaging' | 'other';

export interface Supplier {
  id: number;
  name: string;
  code: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  tax_id: string | null;
  rfc: string | null;
  category: SupplierCategory;
  status: SupplierStatus;
  payment_terms_days: number;
  credit_limit: number | null;
  rating: number | null;
  notes: string | null;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: number;
  updated_at: number | null;
}

export interface CreateSupplierRequest {
  name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  tax_id?: string;
  rfc?: string;
  category?: SupplierCategory;
  status?: SupplierStatus;
  payment_terms_days?: number;
  credit_limit?: number;
  rating?: number;
  notes?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  tax_id?: string;
  rfc?: string;
  category?: SupplierCategory;
  status?: SupplierStatus;
  payment_terms_days?: number;
  credit_limit?: number;
  rating?: number;
  notes?: string;
  is_active?: boolean;
}

export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  pending_suppliers: number;
  blocked_suppliers: number;
  total_orders: number;
  pending_orders: number;
  total_amount: number;
}

export const supplierService = {
  list: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
    category?: string;
    is_active?: boolean;
  }): Promise<{ total: number; suppliers: Supplier[] }> => {
    const response = await api.get('/suppliers/', { params });
    return response.data;
  },

  get: async (id: number): Promise<Supplier> => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  },

  create: async (data: CreateSupplierRequest): Promise<Supplier> => {
    const response = await api.post('/suppliers/', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSupplierRequest): Promise<Supplier> => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },

  getStats: async (): Promise<SupplierStats> => {
    const response = await api.get('/suppliers/stats/overview');
    return response.data;
  },
};
