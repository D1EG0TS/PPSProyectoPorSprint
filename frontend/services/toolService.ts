import api from './api';

export enum ToolStatus {
  AVAILABLE = "AVAILABLE",
  ASSIGNED = "ASSIGNED",
  MAINTENANCE = "MAINTENANCE",
  LOST = "LOST",
  DECOMMISSIONED = "DECOMMISSIONED"
}

export interface Tool {
  id: number;
  product_id: number;
  serial_number: string;
  condition_id: number;
  assigned_to?: number;
  location_id?: number;
  status: ToolStatus;
  created_at: string;
  updated_at: string;
}

export interface ToolCreate {
  product_id: number;
  serial_number: string;
  condition_id: number;
  status?: ToolStatus;
}

export interface ToolUpdate {
  product_id?: number;
  serial_number?: string;
  condition_id?: number;
  status?: ToolStatus;
  assigned_to?: number | null;
  location_id?: number | null;
}

export interface ToolAssignRequest {
  user_id: number;
  notes?: string;
}

export interface ToolCheckInRequest {
  location_id: number;
  condition_id?: number;
  notes?: string;
}

export const getTools = async (params?: { skip?: number; limit?: number; status?: ToolStatus; search?: string }) => {
  const response = await api.get<Tool[]>('/tools/', { params });
  return response.data;
};

export const getToolById = async (id: number) => {
  const response = await api.get<Tool>(`/tools/${id}`);
  return response.data;
};

export const createTool = async (data: ToolCreate) => {
  const response = await api.post<Tool>('/tools/', data);
  return response.data;
};

export const updateTool = async (id: number, data: ToolUpdate) => {
  const response = await api.put<Tool>(`/tools/${id}`, data);
  return response.data;
};

export const deleteTool = async (id: number) => {
  const response = await api.delete<Tool>(`/tools/${id}`);
  return response.data;
};

export const assignTool = async (id: number, data: ToolAssignRequest) => {
  const response = await api.post<Tool>(`/tools/${id}/assign`, data);
  return response.data;
};

export const checkInTool = async (id: number, data: ToolCheckInRequest) => {
  const response = await api.post<Tool>(`/tools/${id}/check-in`, data);
  return response.data;
};

export const getUserTools = async (userId: number) => {
  const response = await api.get<Tool[]>(`/tools/user/${userId}`);
  return response.data;
};

// Placeholder for history if needed
export const getToolHistory = async (id: number) => {
  // Assuming endpoint might be added or we filter history
  // For now return empty or implement if backend has it
  return []; 
};
