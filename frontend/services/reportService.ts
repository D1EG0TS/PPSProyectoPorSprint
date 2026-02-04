import api from './api';

export interface InventorySummary {
    total_items: number;
    total_value: number;
    total_products: number;
}

export interface InventoryTurnover {
    category: string;
    total_out: number;
    movement_count: number;
}

export interface MovementSummary {
    type: string;
    count: number;
    total_quantity: number;
}

export interface VehicleCompliance {
    total_vehicles: number;
    vehicles_with_expired_docs: number;
    vehicles_pending_verification: number;
    compliance_rate: number;
}

export interface EPPExpiration {
    id: number;
    product_name: string;
    serial_number: string;
    expiration_date: string;
    status: string;
    days_until_expiration: number;
}

export const getInventorySummary = async (): Promise<InventorySummary> => {
    const response = await api.get('/reports/inventory/summary');
    return response.data;
};

export const getInventoryTurnover = async (periodDays: number = 30): Promise<InventoryTurnover[]> => {
    const response = await api.get(`/reports/inventory/turnover?period_days=${periodDays}`);
    return response.data;
};

export const getMovementsSummary = async (period: 'week' | 'month' | 'year' = 'month'): Promise<MovementSummary[]> => {
    const response = await api.get(`/reports/movements/summary?period=${period}`);
    return response.data;
};

export interface MovementDaily {
    date: string;
    type: string;
    total_quantity: number;
}

export const getMovementsDaily = async (days: number = 30): Promise<MovementDaily[]> => {
    const response = await api.get(`/reports/movements/daily?days=${days}`);
    return response.data;
};

export const getVehicleCompliance = async (): Promise<VehicleCompliance> => {
    const response = await api.get('/reports/vehicles/compliance');
    return response.data;
};

export const getEPPExpiration = async (days: number = 30): Promise<EPPExpiration[]> => {
    const response = await api.get(`/reports/epp/expiration?days=${days}`);
    return response.data;
};
