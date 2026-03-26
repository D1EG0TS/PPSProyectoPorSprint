import api from './api';

export type CellType = 'zone' | 'aisle' | 'rack' | 'shelf' | 'storage' | 'receiving' | 'shipping' | 'staging' | 'empty';

export type OccupancyLevel = 'empty' | 'low' | 'medium' | 'high' | 'full';

export interface LayoutCell {
  id: number;
  layout_id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  cell_type: CellType;
  name: string | null;
  color: string | null;
  occupancy_level: OccupancyLevel;
  occupancy_percentage: number;
  linked_location_id: number | null;
  linked_aisle: string | null;
  linked_rack: string | null;
  linked_shelf: string | null;
  metadata: Record<string, unknown> | null;
  created_at: number;
  updated_at: number | null;
}

export interface WarehouseLayout {
  id: number;
  warehouse_id: number;
  name: string;
  description: string | null;
  grid_rows: number;
  grid_cols: number;
  cell_width: number;
  cell_height: number;
  is_active: boolean;
  created_by: number;
  updated_by: number | null;
  created_at: number;
  updated_at: number | null;
  cells: LayoutCell[];
}

export interface CreateLayoutRequest {
  warehouse_id: number;
  name: string;
  description?: string;
  grid_rows?: number;
  grid_cols?: number;
  cell_width?: number;
  cell_height?: number;
}

export interface UpdateLayoutRequest {
  name?: string;
  description?: string;
  grid_rows?: number;
  grid_cols?: number;
  cell_width?: number;
  cell_height?: number;
  is_active?: boolean;
}

export interface CreateCellRequest {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  cell_type?: CellType;
  name?: string;
  color?: string;
  linked_location_id?: number;
  linked_aisle?: string;
  linked_rack?: string;
  linked_shelf?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCellRequest {
  row?: number;
  col?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cell_type?: CellType;
  name?: string;
  color?: string;
  occupancy_level?: OccupancyLevel;
  occupancy_percentage?: number;
  linked_location_id?: number;
  linked_aisle?: string;
  linked_rack?: string;
  linked_shelf?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateLayoutRequest {
  rows: number;
  cols: number;
  cell_width?: number;
  cell_height?: number;
}

export interface HeatmapCell {
  row: number;
  col: number;
  occupancy_percentage: number;
  occupancy_level: OccupancyLevel;
  product_count: number;
}

export interface HeatmapData {
  layout_id: number;
  warehouse_id: number;
  cells: HeatmapCell[];
  average_occupancy: number;
  total_capacity: number;
  total_occupancy: number;
}

export interface LayoutExport {
  name: string;
  description: string | null;
  grid_rows: number;
  grid_cols: number;
  cell_width: number;
  cell_height: number;
  cells: Array<{
    row: number;
    col: number;
    x: number;
    y: number;
    width: number;
    height: number;
    cell_type: string;
    name: string | null;
    color: string | null;
    linked_location_id: number | null;
    linked_aisle: string | null;
    linked_rack: string | null;
    linked_shelf: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  exported_at: string;
}

export const warehouseLayoutService = {
  listLayouts: async (skip = 0, limit = 100): Promise<WarehouseLayout[]> => {
    const response = await api.get<WarehouseLayout[]>('/inventory/layout/', {
      params: { skip, limit },
    });
    return response.data;
  },

  getLayoutCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/inventory/layout/count');
    return response.data;
  },

  getLayoutByWarehouse: async (warehouseId: number): Promise<WarehouseLayout> => {
    const response = await api.get<WarehouseLayout>(`/inventory/layout/warehouse/${warehouseId}`);
    return response.data;
  },

  getLayout: async (layoutId: number): Promise<WarehouseLayout> => {
    const response = await api.get<WarehouseLayout>(`/inventory/layout/${layoutId}`);
    return response.data;
  },

  createLayout: async (data: CreateLayoutRequest): Promise<WarehouseLayout> => {
    const response = await api.post<WarehouseLayout>('/inventory/layout/', data);
    return response.data;
  },

  updateLayout: async (layoutId: number, data: UpdateLayoutRequest): Promise<WarehouseLayout> => {
    const response = await api.put<WarehouseLayout>(`/inventory/layout/${layoutId}`, data);
    return response.data;
  },

  deleteLayout: async (layoutId: number): Promise<void> => {
    await api.delete(`/inventory/layout/${layoutId}`);
  },

  listCells: async (layoutId: number): Promise<LayoutCell[]> => {
    const response = await api.get<LayoutCell[]>(`/inventory/layout/${layoutId}/cells`);
    return response.data;
  },

  getCell: async (layoutId: number, cellId: number): Promise<LayoutCell> => {
    const response = await api.get<LayoutCell>(`/inventory/layout/${layoutId}/cells/${cellId}`);
    return response.data;
  },

  createCell: async (layoutId: number, data: CreateCellRequest): Promise<LayoutCell> => {
    const response = await api.post<LayoutCell>(`/inventory/layout/${layoutId}/cells`, data);
    return response.data;
  },

  createCellsBatch: async (layoutId: number, cells: CreateCellRequest[]): Promise<LayoutCell[]> => {
    const response = await api.post<LayoutCell[]>(`/inventory/layout/${layoutId}/cells/batch`, cells);
    return response.data;
  },

  updateCell: async (layoutId: number, cellId: number, data: UpdateCellRequest): Promise<LayoutCell> => {
    const response = await api.put<LayoutCell>(`/inventory/layout/${layoutId}/cells/${cellId}`, data);
    return response.data;
  },

  updateCellsBatch: async (layoutId: number, cells: UpdateCellRequest[]): Promise<LayoutCell[]> => {
    const response = await api.put<LayoutCell[]>(`/inventory/layout/${layoutId}/cells/batch`, { cells });
    return response.data;
  },

  deleteCell: async (layoutId: number, cellId: number): Promise<void> => {
    await api.delete(`/inventory/layout/${layoutId}/cells/${cellId}`);
  },

  generateLayout: async (layoutId: number, data: GenerateLayoutRequest): Promise<LayoutCell[]> => {
    const response = await api.post<LayoutCell[]>(`/inventory/layout/${layoutId}/generate`, data);
    return response.data;
  },

  getHeatmap: async (layoutId: number): Promise<HeatmapData> => {
    const response = await api.get<HeatmapData>(`/inventory/layout/${layoutId}/heatmap`);
    return response.data;
  },

  exportLayout: async (layoutId: number): Promise<LayoutExport> => {
    const response = await api.get<LayoutExport>(`/inventory/layout/${layoutId}/export`);
    return response.data;
  },

  importLayout: async (warehouseId: number, data: Partial<LayoutExport>): Promise<WarehouseLayout> => {
    const response = await api.post<WarehouseLayout>(`/inventory/layout/import?warehouse_id=${warehouseId}`, data);
    return response.data;
  },
};

export default warehouseLayoutService;
