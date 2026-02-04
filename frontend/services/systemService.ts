import api from './api';

export interface SystemConfig {
  key: string;
  value: string;
  description?: string;
}

export interface SystemMetrics {
  total_users: number;
  active_users: number;
  total_products: number;
  total_movements: number;
}

export interface SystemHealth {
  status: string;
  database: string;
  timestamp: string;
  version: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  changed_by?: number;
  action: string;
  details?: string;
  created_at: string;
  target_user_email?: string;
  actor_email?: string;
}

const systemService = {
  getConfig: async (): Promise<SystemConfig[]> => {
    const response = await api.get('/system/config');
    return response.data;
  },

  updateConfig: async (config: SystemConfig): Promise<SystemConfig> => {
    const response = await api.put('/system/config', config);
    return response.data;
  },

  getMetrics: async (): Promise<SystemMetrics> => {
    const response = await api.get('/system/metrics');
    return response.data;
  },

  getHealth: async (): Promise<SystemHealth> => {
    const response = await api.get('/system/health');
    return response.data;
  },

  getLogs: async (params?: { skip?: number; limit?: number; user_id?: number; action?: string }): Promise<AuditLog[]> => {
    const response = await api.get('/system/logs', { params });
    return response.data;
  },

  cleanupLogs: async (days: number): Promise<{ message: string }> => {
    const response = await api.post(`/system/cleanup?days=${days}`);
    return response.data;
  }
};

export default systemService;
