import { supplierService, Supplier, SupplierStatus } from '../../services/supplierService';
import api from '../../services/api';

jest.mock('../../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    baseURL: 'http://localhost:8000',
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('supplierService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return list of suppliers', async () => {
      const mockResponse = {
        total: 2,
        suppliers: [
          { id: 1, name: 'Supplier 1', code: 'SUP001', status: 'active' },
          { id: 2, name: 'Supplier 2', code: 'SUP002', status: 'active' },
        ],
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await supplierService.list();

      expect(mockedApi.get).toHaveBeenCalledWith('/suppliers/', { params: undefined });
      expect(result.total).toBe(2);
      expect(result.suppliers).toHaveLength(2);
    });

    it('should pass search params', async () => {
      const mockResponse = { total: 1, suppliers: [{ id: 1, name: 'Test', code: 'SUP001' }] };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      await supplierService.list({ search: 'test', status: 'active' });

      expect(mockedApi.get).toHaveBeenCalledWith('/suppliers/', {
        params: { search: 'test', status: 'active' },
      });
    });
  });

  describe('get', () => {
    it('should return supplier by id', async () => {
      const mockSupplier = { id: 1, name: 'Test Supplier', code: 'SUP001' };
      mockedApi.get.mockResolvedValue({ data: mockSupplier });

      const result = await supplierService.get(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/suppliers/1');
      expect(result.name).toBe('Test Supplier');
    });
  });

  describe('create', () => {
    it('should create a new supplier', async () => {
      const mockRequest = { name: 'New Supplier', email: 'test@example.com' };
      const mockResponse = { id: 1, ...mockRequest, code: 'SUP001', status: 'active' };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await supplierService.create(mockRequest);

      expect(mockedApi.post).toHaveBeenCalledWith('/suppliers/', mockRequest);
      expect(result.id).toBe(1);
    });
  });

  describe('update', () => {
    it('should update supplier', async () => {
      const mockUpdate = { name: 'Updated Name' };
      const mockResponse = { id: 1, name: 'Updated Name', code: 'SUP001' };
      mockedApi.put.mockResolvedValue({ data: mockResponse });

      const result = await supplierService.update(1, mockUpdate);

      expect(mockedApi.put).toHaveBeenCalledWith('/suppliers/1', mockUpdate);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('delete', () => {
    it('should delete supplier', async () => {
      mockedApi.delete.mockResolvedValue({ data: undefined });

      await supplierService.delete(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/suppliers/1');
    });
  });

  describe('getStats', () => {
    it('should return supplier stats', async () => {
      const mockStats = {
        total_suppliers: 10,
        active_suppliers: 8,
        pending_suppliers: 1,
        blocked_suppliers: 1,
        total_orders: 25,
        pending_orders: 5,
        total_amount: 100000,
      };
      mockedApi.get.mockResolvedValue({ data: mockStats });

      const result = await supplierService.getStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/suppliers/stats/overview');
      expect(result.total_suppliers).toBe(10);
    });
  });
});
