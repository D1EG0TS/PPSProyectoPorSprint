import api from './api';

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  location?: string;
  is_active: boolean;
  created_by: number;
}

export interface WarehouseCreate {
  code: string;
  name: string;
  location?: string;
}

export interface WarehouseUpdate {
  name?: string;
  location?: string;
  is_active?: boolean;
}

export interface Location {
  id: number;
  warehouse_id: number;
  parent_location_id?: number | null;
  code: string;
  name: string;
  path?: string;
  children?: Location[];
}

export interface LocationCreate {
  code: string;
  name: string;
  parent_location_id?: number | null;
}

export interface LocationUpdate {
  code?: string;
  name?: string;
  parent_location_id?: number | null;
}

export interface WarehouseStockItem {
  product_id: number;
  quantity: number;
}

export const warehouseService = {
  getWarehouses: async (skip = 0, limit = 100) => {
    const response = await api.get<Warehouse[]>('/warehouses/', {
      params: { skip, limit },
    });
    return response.data;
  },

  getWarehouseStock: async (id: number) => {
    const response = await api.get<WarehouseStockItem[]>(`/warehouses/${id}/stock`);
    return response.data;
  },

  getWarehouse: async (id: number) => {
    const response = await api.get<Warehouse>(`/warehouses/${id}`);
    return response.data;
  },

  createWarehouse: async (data: WarehouseCreate) => {
    const response = await api.post<Warehouse>('/warehouses/', data);
    return response.data;
  },

  updateWarehouse: async (id: number, data: WarehouseUpdate) => {
    const response = await api.put<Warehouse>(`/warehouses/${id}`, data);
    return response.data;
  },

  deleteWarehouse: async (id: number) => {
    const response = await api.delete(`/warehouses/${id}`);
    return response.data;
  },

  getLocations: async (warehouseId: number) => {
    const response = await api.get<Location[]>(`/warehouses/${warehouseId}/locations`);
    return response.data;
  },

  createLocation: async (warehouseId: number, data: LocationCreate) => {
    const response = await api.post<Location>(`/warehouses/${warehouseId}/locations`, data);
    return response.data;
  },
  
  updateLocation: async (warehouseId: number, locationId: number, data: LocationUpdate) => {
    const response = await api.put<Location>(`/warehouses/${warehouseId}/locations/${locationId}`, data);
    return response.data;
  },

  deleteLocation: async (warehouseId: number, locationId: number) => {
    await api.delete(`/warehouses/${warehouseId}/locations/${locationId}`);
  },
};
