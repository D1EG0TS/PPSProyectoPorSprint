import api from './api';
import { Platform } from 'react-native';

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
  brand?: string;
  model?: string;
  image_url?: string;
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
  total_stock?: number; // Added for catalog view
}

export interface ProductCreate {
  sku?: string; // Optional (auto-generated)
  barcode?: string;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  image_url?: string;
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
  brand?: string;
  model?: string;
  image_url?: string;
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
  parent_id?: number;
  subcategories?: Category[];
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
  location_id?: number;
  category_id?: number;
  brand?: string;
  order_by?: 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';
  include_inactive?: boolean;
}) => {
  const response = await api.get<Product[]>('/products/', { params });
  return response.data;
};

export const getProductById = async (id: number) => {
  const response = await api.get<Product>(`/products/${id}`);
  return response.data;
};

export const createProduct = async (product: ProductCreate, imageUri?: string) => {
  const formData = new FormData();

  // Append product fields
  Object.keys(product).forEach(key => {
    const value = product[key as keyof ProductCreate];
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  // Append image if present
  if (imageUri) {
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;
    
    if (Platform.OS === 'web') {
      // Fetch blob from URI
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('image', blob, filename);
    } else {
      // @ts-ignore
      formData.append('image', { uri: imageUri, name: filename, type });
    }
  }

  const response = await api.post<Product>('/products/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateProduct = async (id: number, product: ProductUpdate) => {
  const response = await api.put<Product>(`/products/${id}`, product);
  return response.data;
};

export const deleteProduct = async (id: number) => {
  const response = await api.delete<Product>(`/products/${id}`);
  return response.data;
};

export interface CategoryCreate {
  name: string;
  description?: string;
  parent_id?: number;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  parent_id?: number;
}

export interface UnitCreate {
  name: string;
  abbreviation: string;
}

export interface UnitUpdate {
  name?: string;
  abbreviation?: string;
}

export const getCategories = async () => {
  const response = await api.get<Category[]>('/products/categories/');
  return response.data;
};

export const createCategory = async (category: CategoryCreate) => {
  const response = await api.post<Category>('/products/categories/', category);
  return response.data;
};

export const updateCategory = async (id: number, category: CategoryUpdate) => {
  const response = await api.put<Category>(`/products/categories/${id}`, category);
  return response.data;
};

export const deleteCategory = async (id: number) => {
  const response = await api.delete<Category>(`/products/categories/${id}`);
  return response.data;
};

export const getUnits = async () => {
  const response = await api.get<Unit[]>('/products/units/');
  return response.data;
};

export const createUnit = async (unit: UnitCreate) => {
  const response = await api.post<Unit>('/products/units/', unit);
  return response.data;
};

export const updateUnit = async (id: number, unit: UnitUpdate) => {
  const response = await api.put<Unit>(`/products/units/${id}`, unit);
  return response.data;
};

export const deleteUnit = async (id: number) => {
  const response = await api.delete<Unit>(`/products/units/${id}`);
  return response.data;
};

export const getBrands = async (category_id?: number) => {
  const params = category_id ? { category_id } : {};
  const response = await api.get<string[]>('/products/brands', { params });
  return response.data;
};

export const createProductBatch = async (productId: number, batch: ProductBatchCreate) => {
  const response = await api.post<ProductBatch>(`/products/${productId}/batches`, batch);
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

export const getProductLedger = async (id: number, params?: { skip?: number; limit?: number }) => {
  const response = await api.get(`/products/${id}/ledger`, { params });
  return response.data;
};

export const uploadProductImage = async (id: number, imageUri: string) => {
  const formData = new FormData();
  
  const filename = imageUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;
  
  if (Platform.OS === 'web') {
    // Fetch blob from URI
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append('file', blob, filename);
  } else {
    // @ts-ignore
    formData.append('file', { uri: imageUri, name: filename, type });
  }
  
  const response = await api.post<Product>(`/products/${id}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
