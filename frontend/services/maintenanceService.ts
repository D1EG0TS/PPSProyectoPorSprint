import api from './api';
import { 
  MaintenanceType, 
  MaintenanceRecord, 
  MaintenanceRecordCreate, 
  MaintenanceRecordUpdate, 
  UpcomingMaintenance,
  MaintenanceStats,
  DashboardStats
} from '../types/maintenance';

export const maintenanceService = {
  // Types
  getTypes: async (activeOnly: boolean = true) => {
    const response = await api.get<MaintenanceType[]>('/vehicles/maintenance/types', {
      params: { active_only: activeOnly }
    });
    return response.data;
  },

  // Records
  getHistory: async (vehicleId: number) => {
    const response = await api.get<MaintenanceRecord[]>(`/vehicles/maintenance/records/${vehicleId}`);
    return response.data;
  },

  getRecord: async (recordId: number) => {
    const response = await api.get<MaintenanceRecord>(`/vehicles/maintenance/record/${recordId}`);
    return response.data;
  },

  createRecord: async (data: MaintenanceRecordCreate) => {
    const response = await api.post<MaintenanceRecord>('/vehicles/maintenance/records', data);
    return response.data;
  },

  updateRecord: async (recordId: number, data: MaintenanceRecordUpdate) => {
    const response = await api.put<MaintenanceRecord>(`/vehicles/maintenance/record/${recordId}`, data);
    return response.data;
  },

  updateStatus: async (recordId: number, status: string) => {
    const response = await api.put<MaintenanceRecord>(`/vehicles/maintenance/record/${recordId}`, { status });
    return response.data;
  },

  completeRecord: async (recordId: number) => {
    const response = await api.post<MaintenanceRecord>(`/vehicles/maintenance/record/${recordId}/complete`);
    return response.data;
  },

  approveRecord: async (recordId: number) => {
    const response = await api.post<MaintenanceRecord>(`/vehicles/maintenance/record/${recordId}/approve`);
    return response.data;
  },

  // Reports/Dashboard
  getUpcoming: async () => {
    const response = await api.get<UpcomingMaintenance[]>('/vehicles/maintenance/upcoming');
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get<DashboardStats>('/vehicles/maintenance/dashboard/stats');
    return response.data;
  }
};
