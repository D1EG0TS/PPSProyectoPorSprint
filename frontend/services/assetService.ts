import api from './api';
import { 
    Asset, AssetCategory, AssetCreate, AssetUpdate, 
    AssetMaintenance, AssetCalibration, AssetAssignment, AssetType 
} from '../types/assets';

export const assetService = {
    // Categories
    getCategories: async () => {
        const response = await api.get<AssetCategory[]>('/assets/categories');
        return response.data;
    },

    getCategoryTypes: async () => {
        const response = await api.get<string[]>('/assets/categories/types');
        return response.data;
    },

    createCategory: async (data: any) => {
        const response = await api.post<AssetCategory>('/assets/categories', data);
        return response.data;
    },

    // Assets
    getAssets: async (params?: { type?: AssetType; status?: string; location_id?: number; search?: string }) => {
        const response = await api.get<Asset[]>('/assets', { params });
        return response.data;
    },

    getAsset: async (id: number) => {
        const response = await api.get<Asset>(`/assets/${id}`);
        return response.data;
    },

    createAsset: async (data: AssetCreate) => {
        const response = await api.post<Asset>('/assets', data);
        return response.data;
    },

    updateAsset: async (id: number, data: AssetUpdate) => {
        const response = await api.put<Asset>(`/assets/${id}`, data);
        return response.data;
    },

    calculateDepreciation: async (id: number) => {
        const response = await api.post(`/assets/${id}/depreciate`);
        return response.data;
    },

    // Type specific helpers
    getTools: async () => {
        const response = await api.get<Asset[]>('/assets/tools');
        return response.data;
    },

    getMeasuringEquipment: async () => {
        const response = await api.get<Asset[]>('/assets/measuring');
        return response.data;
    },

    getComputers: async () => {
        const response = await api.get<Asset[]>('/assets/computers');
        return response.data;
    },

    // Maintenance
    getMaintenanceHistory: async (id: number) => {
        const response = await api.get<AssetMaintenance[]>(`/assets/${id}/maintenance`);
        return response.data;
    },

    scheduleMaintenance: async (id: number, data: any) => {
        const response = await api.post<AssetMaintenance>(`/assets/${id}/maintenance`, data);
        return response.data;
    },

    // Calibration
    getCalibrationHistory: async (id: number) => {
        const response = await api.get<AssetCalibration[]>(`/assets/${id}/calibration-history`);
        return response.data;
    },

    recordCalibration: async (id: number, data: any) => {
        const response = await api.post<AssetCalibration>(`/assets/${id}/calibrate`, data);
        return response.data;
    },

    getCalibrationDue: async (days: number = 30) => {
        const response = await api.get<AssetCalibration[]>('/assets/calibration/due', { params: { days } });
        return response.data;
    },

    // Assignments
    getAssignments: async (id: number) => {
        const response = await api.get<AssetAssignment[]>(`/assets/${id}/assignments`);
        return response.data;
    },

    assignAsset: async (id: number, data: { assigned_to: number; purpose?: string; expected_return_date?: string }) => {
        const response = await api.post<AssetAssignment>(`/assets/${id}/assign`, data);
        return response.data;
    },

    returnAsset: async (id: number, condition: string) => {
        const response = await api.post<AssetAssignment>(`/assets/${id}/return`, { condition_in: condition });
        return response.data;
    },

    // Dashboard & Reports
    getDashboardWidgets: async () => {
        const response = await api.get('/assets/dashboard/widgets');
        return response.data;
    },

    getCalibrationReport: async () => {
        const response = await api.get('/assets/reports/calibration');
        return response.data;
    },

    getMaintenanceReport: async (assetId?: number) => {
        const params = assetId ? { asset_id: assetId } : {};
        const response = await api.get('/assets/reports/maintenance', { params });
        return response.data;
    },

    getValuationReport: async () => {
        const response = await api.get('/assets/reports/valuation');
        return response.data;
    },

    getUtilizationReport: async () => {
        const response = await api.get('/assets/reports/utilization');
        return response.data;
    }
};
