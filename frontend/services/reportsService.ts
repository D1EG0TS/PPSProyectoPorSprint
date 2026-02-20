import api from './api';

export const reportsService = {
    getItemsOnLoan: async () => {
        const response = await api.get('/reports/items-on-loan');
        return response.data;
    },

    getUserResponsibility: async (userId: number) => {
        const response = await api.get(`/reports/user-responsibility/${userId}`);
        return response.data;
    },

    getUtilizationStats: async () => {
        const response = await api.get('/reports/utilization');
        return response.data;
    }
};
