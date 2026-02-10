import api from './api';
import { StorageLocation, ProductLocationAssignment, ProductRelocationRequest } from '../types/location';

export const locationService = {
  getById: async (id: number) => {
    const response = await api.get<StorageLocation>(`/locations/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<StorageLocation>) => {
    const response = await api.put<StorageLocation>(`/locations/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/locations/${id}`);
  },

  getInventory: async (id: number) => {
    const response = await api.get<ProductLocationAssignment[]>(`/locations/${id}/inventory`);
    return response.data;
  },

  searchByBarcode: async (query: string) => {
    const response = await api.get<StorageLocation[]>('/locations/search', {
      params: { q: query }
    });
    return response.data;
  },
  
  assignProduct: async (productId: number, data: {
    location_id: number;
    warehouse_id: number;
    quantity: number;
    assignment_type?: string;
    batch_id?: number;
  }) => {
    const response = await api.post(`/products/${productId}/locations`, {
      ...data,
      product_id: productId
    });
    return response.data;
  },

  relocateProduct: async (productId: number, data: ProductRelocationRequest) => {
    const response = await api.post(`/products/${productId}/relocate`, data);
    return response.data;
  }
};
