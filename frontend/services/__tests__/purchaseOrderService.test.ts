import { purchaseOrderService, PurchaseOrder, PurchaseOrderStatus } from '../../services/purchaseOrderService';
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

describe('purchaseOrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return list of orders', async () => {
      const mockResponse = {
        total: 2,
        orders: [
          { id: 1, order_number: 'PO000001', status: 'draft' },
          { id: 2, order_number: 'PO000002', status: 'pending_approval' },
        ],
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await purchaseOrderService.list();

      expect(mockedApi.get).toHaveBeenCalledWith('/purchase-orders/', { params: undefined });
      expect(result.total).toBe(2);
      expect(result.orders).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const mockResponse = { total: 1, orders: [{ id: 1, status: 'approved' }] };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      await purchaseOrderService.list({ status: 'approved' });

      expect(mockedApi.get).toHaveBeenCalledWith('/purchase-orders/', {
        params: { status: 'approved' },
      });
    });
  });

  describe('get', () => {
    it('should return order by id', async () => {
      const mockOrder = { id: 1, order_number: 'PO000001', status: 'draft', items: [] };
      mockedApi.get.mockResolvedValue({ data: mockOrder });

      const result = await purchaseOrderService.get(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/purchase-orders/1');
      expect(result.order_number).toBe('PO000001');
    });
  });

  describe('create', () => {
    it('should create a new order', async () => {
      const mockRequest = {
        supplier_id: 1,
        items: [{ product_name: 'Test', quantity: 10, unit_price: 100 }],
      };
      const mockResponse = {
        id: 1,
        order_number: 'PO000001',
        ...mockRequest,
        status: 'draft',
        items: [],
      };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await purchaseOrderService.create(mockRequest);

      expect(mockedApi.post).toHaveBeenCalledWith('/purchase-orders/', mockRequest);
      expect(result.id).toBe(1);
    });
  });

  describe('submit', () => {
    it('should submit a draft order', async () => {
      const mockResponse = { id: 1, status: 'pending_approval' };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await purchaseOrderService.submit(1);

      expect(mockedApi.post).toHaveBeenCalledWith('/purchase-orders/1/submit');
      expect(result.status).toBe('pending_approval');
    });
  });

  describe('approve', () => {
    it('should approve a pending order', async () => {
      const mockResponse = { id: 1, status: 'approved' };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await purchaseOrderService.approve(1);

      expect(mockedApi.post).toHaveBeenCalledWith('/purchase-orders/1/approve');
      expect(result.status).toBe('approved');
    });
  });

  describe('reject', () => {
    it('should reject a pending order', async () => {
      const mockResponse = { id: 1, status: 'rejected' };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await purchaseOrderService.reject(1);

      expect(mockedApi.post).toHaveBeenCalledWith('/purchase-orders/1/reject');
      expect(result.status).toBe('rejected');
    });
  });

  describe('send', () => {
    it('should send an approved order', async () => {
      const mockResponse = { id: 1, status: 'sent' };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await purchaseOrderService.send(1);

      expect(mockedApi.post).toHaveBeenCalledWith('/purchase-orders/1/send');
      expect(result.status).toBe('sent');
    });
  });

  describe('receive', () => {
    it('should mark order as received', async () => {
      const mockResponse = { id: 1, status: 'received' };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await purchaseOrderService.receive(1);

      expect(mockedApi.post).toHaveBeenCalledWith('/purchase-orders/1/receive');
      expect(result.status).toBe('received');
    });
  });

  describe('cancel', () => {
    it('should cancel an order', async () => {
      const mockResponse = { id: 1, status: 'cancelled' };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await purchaseOrderService.cancel(1);

      expect(mockedApi.post).toHaveBeenCalledWith('/purchase-orders/1/cancel');
      expect(result.status).toBe('cancelled');
    });
  });

  describe('getStats', () => {
    it('should return order stats', async () => {
      const mockStats = {
        total_orders: 20,
        draft_orders: 5,
        pending_orders: 3,
        approved_orders: 7,
        received_orders: 4,
        cancelled_orders: 1,
        total_amount: 500000,
        pending_amount: 150000,
      };
      mockedApi.get.mockResolvedValue({ data: mockStats });

      const result = await purchaseOrderService.getStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/purchase-orders/stats/overview');
      expect(result.total_orders).toBe(20);
    });
  });
});
