import api from './api';
import { StorageLocation } from '../types/location';

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
  location_type?: string;
  capacity?: number;
  current_occupancy?: number;
  aisle?: string;
  rack?: string;
  shelf?: string;
  position?: string;
  is_restricted?: boolean;
  barcode?: string;
}

export interface LocationCreate {
  code: string;
  name: string;
  parent_location_id?: number | null;
  location_type?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  position?: string;
  capacity?: number;
}

export interface LocationUpdate {
  code?: string;
  name?: string;
  parent_location_id?: number | null;
  location_type?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  position?: string;
  capacity?: number;
  is_restricted?: boolean;
  barcode?: string;
}

export interface WarehouseStockItem {
  product_id: number;
  quantity: number;
}

export interface BatchLocationCreate {
  parent_location_id?: number | null;
  location_type: string;
  prefix: string;
  start_number: number;
  count: number;
  name_template: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  position_prefix?: string;
  capacity: number;
  barcode_prefix?: string;
}

export interface BatchLocationResponse {
  created: number;
  locations: Location[];
  errors: string[];
}

export interface LocationHierarchy {
  aisles: string[];
  racks: string[];
  shelves: string[];
  positions: string[];
}

export interface ContainerCheck {
  available: boolean;
  current_product?: string;
  current_product_id?: number;
  current_quantity: number;
  remaining_capacity?: number;
  location_id?: number;
  location_code?: string;
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
    await api.delete(`/warehouses/${id}`);
  },

  getLocations: async (warehouseId: number) => {
    const response = await api.get<StorageLocation[]>(`/warehouses/${warehouseId}/locations`);
    return response.data;
  },

  getLocationsTree: async (warehouseId: number) => {
    const response = await api.get<StorageLocation[]>(`/warehouses/${warehouseId}/locations/tree`);
    return response.data;
  },

  getLocationChildren: async (warehouseId: number, parentId?: number | null) => {
    const response = await api.get<StorageLocation[]>(`/warehouses/${warehouseId}/locations/children`, {
      params: { parent_id: parentId ?? undefined }
    });
    return response.data;
  },

  getLocationHierarchy: async (warehouseId: number, aisle?: string, rack?: string, shelf?: string) => {
    const response = await api.get<LocationHierarchy>(`/warehouses/${warehouseId}/locations/hierarchy`, {
      params: { aisle, rack, shelf }
    });
    return response.data;
  },

  createLocation: async (warehouseId: number, data: LocationCreate) => {
    const response = await api.post<StorageLocation>(`/warehouses/${warehouseId}/locations`, data);
    return response.data;
  },

  createLocationsBatch: async (warehouseId: number, data: BatchLocationCreate) => {
    const response = await api.post<BatchLocationResponse>(`/warehouses/${warehouseId}/locations/batch`, data);
    return response.data;
  },

  duplicateLocation: async (warehouseId: number, locationId: number, newCode: string, newName?: string) => {
    const response = await api.post<StorageLocation>(
      `/warehouses/${warehouseId}/locations/${locationId}/duplicate`,
      null,
      { params: { new_code: newCode, new_name: newName } }
    );
    return response.data;
  },
  
  updateLocation: async (warehouseId: number, locationId: number, data: LocationUpdate) => {
    const response = await api.put<StorageLocation>(`/warehouses/${warehouseId}/locations/${locationId}`, data);
    return response.data;
  },

  deleteLocation: async (warehouseId: number, locationId: number) => {
    await api.delete(`/warehouses/${warehouseId}/locations/${locationId}`);
  },

  checkContainer: async (containerCode: string, excludeProductId?: number) => {
    const response = await api.get<ContainerCheck>('/warehouses/locations/check-container', {
      params: { 
        container_code: containerCode,
        exclude_product_id: excludeProductId
      }
    });
    return response.data;
  },
};
