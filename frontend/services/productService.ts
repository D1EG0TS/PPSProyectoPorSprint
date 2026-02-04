import api from './api';

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
  batches?: any[]; // Define specific type if needed
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
