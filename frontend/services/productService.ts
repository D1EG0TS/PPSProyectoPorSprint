import api from './api';

export interface ProductBatch {
  id: number;
  product_id: number;
  batch_number: string;
  manufactured_date?: string;
  expiration_date?: string;
  quantity: number;
}

export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id: number;
  unit_id: number;
  cost?: number;
  price?: number;
  min_stock?: number;
  target_stock?: number;
  has_batch?: boolean;
  has_expiration?: boolean;
  is_active?: boolean;
  batches?: ProductBatch[];
}

export interface ProductCreate {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id: number;
  unit_id: number;
  cost?: number;
  price?: number;
  min_stock?: number;
  target_stock?: number;
  has_batch?: boolean;
  has_expiration?: boolean;
  is_active?: boolean;
}

export interface ProductUpdate {
  sku?: string;
  barcode?: string;
  name?: string;
  description?: string;
  category_id?: number;
  unit_id?: number;
  cost?: number;
  price?: number;
  min_stock?: number;
  target_stock?: number;
  has_batch?: boolean;
  has_expiration?: boolean;
  is_active?: boolean;
}

export interface ProductBatchCreate {
  batch_number: string;
  manufactured_date?: string;
  expiration_date?: string;
  quantity: number;
}

export interface ProductBatchUpdate {
  batch_number?: string;
  quantity?: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
}

export const getProducts = async (params?: {
  skip?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  order_by?: 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';
}) => {
  const response = await api.get<Product[]>('/products/', { params });
  return response.data;
};

export const getProductById = async (id: number) => {
  const response = await api.get<Product>(`/products/${id}`);
  return response.data;
};

export const getProductByCode = async (code: string) => {
  try {
    const response = await api.get<Product>(`/products/scan/${code}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

export const createProduct = async (data: ProductCreate) => {
  const response = await api.post<Product>('/products/', data);
  return response.data;
};

export const updateProduct = async (id: number, data: ProductUpdate) => {
  const response = await api.put<Product>(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: number) => {
  const response = await api.delete<Product>(`/products/${id}`);
  return response.data;
};

export const getProductBatches = async (id: number) => {
  const response = await api.get<ProductBatch[]>(`/products/${id}/batches`);
  return response.data;
};

export const createProductBatch = async (id: number, data: ProductBatchCreate) => {
  const response = await api.post<ProductBatch>(`/products/${id}/batches`, data);
  return response.data;
};

export const updateProductBatch = async (batchId: number, data: ProductBatchUpdate) => {
  const response = await api.put<ProductBatch>(`/products/batches/${batchId}`, data);
  return response.data;
};

export const scanProduct = async (code: string) => {
  const response = await api.get<Product>(`/products/scan/${code}`);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get<Category[]>('/products/categories/');
  return response.data;
};

export const getUnits = async () => {
  const response = await api.get<Unit[]>('/products/units/');
  return response.data;
};

export const getProductLedger = async (id: number, params?: { skip?: number; limit?: number }) => {
  const response = await api.get<any[]>(`/products/${id}/ledger`, { params });
  return response.data;
};
