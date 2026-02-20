import api from './api';
import { 
    IntegratedRequest, 
    IntegratedRequestCreate, 
    RequestItemCreate, 
    RequestToolCreate, 
    RequestEPPCreate, 
    RequestVehicleCreate 
} from '../types/integratedRequest';

export const integratedRequestService = {
    getAll: async (skip = 0, limit = 100) => {
        const response = await api.get<IntegratedRequest[]>('/requests/integrated', {
            params: { skip, limit }
        });
        return response.data;
    },

    getById: async (id: number) => {
        const response = await api.get<IntegratedRequest>(`/requests/integrated/${id}`);
        return response.data;
    },

    create: async (data: IntegratedRequestCreate) => {
        const response = await api.post<IntegratedRequest>('/requests/integrated', data);
        return response.data;
    },

    update: async (id: number, data: Partial<IntegratedRequestCreate>) => {
        const response = await api.put<IntegratedRequest>(`/requests/integrated/${id}`, data);
        return response.data;
    },

    submit: async (id: number) => {
        const response = await api.post<IntegratedRequest>(`/requests/integrated/${id}/submit`);
        return response.data;
    },

    approve: async (id: number) => {
        const response = await api.post<IntegratedRequest>(`/requests/integrated/${id}/approve`);
        return response.data;
    },

    reject: async (id: number, reason: string) => {
        const response = await api.post<IntegratedRequest>(`/requests/integrated/${id}/reject`, null, {
            params: { reason }
        });
        return response.data;
    },

    addItem: async (requestId: number, item: RequestItemCreate) => {
        const response = await api.post<IntegratedRequest>(`/requests/integrated/${requestId}/items`, item);
        return response.data;
    },

    addTool: async (requestId: number, tool: RequestToolCreate) => {
        const response = await api.post<IntegratedRequest>(`/requests/integrated/${requestId}/tools`, tool);
        return response.data;
    },

    addEPP: async (requestId: number, epp: RequestEPPCreate) => {
        const response = await api.post<IntegratedRequest>(`/requests/integrated/${requestId}/epp`, epp);
        return response.data;
    },

    addVehicle: async (requestId: number, vehicle: RequestVehicleCreate) => {
        const response = await api.post<IntegratedRequest>(`/requests/integrated/${requestId}/vehicles`, vehicle);
        return response.data;
    },

    updateItemStatus: async (requestId: number, itemId: number, status: string, data: any = {}) => {
        const response = await api.put(`/requests/integrated/${requestId}/items/${itemId}`, { status, ...data });
        return response.data;
    },

    updateToolStatus: async (requestId: number, toolId: number, status: string, data: any = {}) => {
        const response = await api.put(`/requests/integrated/${requestId}/tools/${toolId}`, { status, ...data });
        return response.data;
    },

    updateEPPStatus: async (requestId: number, eppId: number, status: string, data: any = {}) => {
        const response = await api.put(`/requests/integrated/${requestId}/epp/${eppId}`, { status, ...data });
        return response.data;
    },

    updateVehicleStatus: async (requestId: number, vehicleId: number, status: string, data: any = {}) => {
        const response = await api.put(`/requests/integrated/${requestId}/vehicles/${vehicleId}`, { status, ...data });
        return response.data;
    }
};
