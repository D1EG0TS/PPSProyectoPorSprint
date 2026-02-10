import api from './api';
import { 
  CatalogItem, 
  CatalogPermissions, 
  PublicCatalogItem, 
  OperationalCatalogItem, 
  InternalCatalogItem, 
  AdminCatalogItem 
} from '../types/catalog';

export const catalogService = {
  getPublicCatalog: async (skip = 0, limit = 100, search?: string) => {
    const params: any = { skip, limit };
    if (search) params.search = search;
    const response = await api.get<PublicCatalogItem[]>('/catalog/public', { params });
    return response.data;
  },

  getPublicProduct: async (id: number) => {
    // Note: Ideally this should be a specific endpoint. 
    // For now we fetch the list and find the item as a fallback or if no direct endpoint exists.
    // In a real scenario, we should ask backend for GET /catalog/public/{id}
    const response = await api.get<PublicCatalogItem[]>('/catalog/public', { params: { limit: 1000 } });
    return response.data.find(p => p.id === id);
  },

  getOperationalCatalog: async (skip = 0, limit = 100, search?: string) => {
    const params: any = { skip, limit };
    if (search) params.search = search;
    const response = await api.get<OperationalCatalogItem[]>('/catalog/operational', { params });
    return response.data;
  },

  getInternalCatalog: async (skip = 0, limit = 100, search?: string) => {
    const params: any = { skip, limit };
    if (search) params.search = search;
    const response = await api.get<(InternalCatalogItem | AdminCatalogItem)[]>('/catalog/internal', { params });
    return response.data;
  },

  searchCatalog: async (query: string, skip = 0, limit = 100) => {
    const params = { q: query, skip, limit };
    const response = await api.get<CatalogItem[]>('/catalog/search', { params });
    return response.data;
  },

  getPermissions: async () => {
    const response = await api.get<CatalogPermissions>('/catalog/permissions');
    return response.data;
  }
};
