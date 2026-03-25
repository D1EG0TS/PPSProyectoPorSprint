import { inventoryService } from '../../services/inventoryService';
import api from '../../services/api';

jest.mock('../../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('inventoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scan', () => {
    it('should scan a product by code', async () => {
      const mockResponse = {
        data: {
          found: true,
          product_id: 1,
          sku: 'TEST-001',
          barcode: '1234567890',
          name: 'Test Product',
          current_stock: 100,
          min_stock: 10,
          locations: [],
        },
      };
      mockedApi.post.mockResolvedValue(mockResponse);

      const result = await inventoryService.scan('TEST-001');

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/scan', { code: 'TEST-001' }, expect.any(Object));
      expect(result).toEqual(mockResponse.data);
    });

    it('should scan with warehouse filter', async () => {
      const mockResponse = { data: { found: true, product_id: 1 } };
      mockedApi.post.mockResolvedValue(mockResponse);

      await inventoryService.scan('TEST-001', 1);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/scan', { code: 'TEST-001' }, { params: { warehouse_id: 1 } });
    });
  });

  describe('receive', () => {
    it('should receive merchandise', async () => {
      const mockRequest = {
        warehouse_id: 1,
        items: [{ product_id: 1, quantity: 50 }],
        reference: 'OC-001',
      };
      const mockResponse = {
        data: {
          success: true,
          movement_request_id: 123,
          request_number: 'IN-20240325143022',
          items_received: 1,
          message: 'Mercancía recibida exitosamente',
        },
      };
      mockedApi.post.mockResolvedValue(mockResponse);

      const result = await inventoryService.receive(mockRequest);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/receive', mockRequest);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('adjust', () => {
    it('should create an adjustment', async () => {
      const mockRequest = {
        items: [{
          product_id: 1,
          warehouse_id: 1,
          quantity: -5,
          reason: 'DAMAGE' as const,
        }],
      };
      const mockResponse = {
        data: {
          success: true,
          movement_request_id: 124,
          request_number: 'ADJ-20240325143500',
          adjustments_count: 1,
          message: 'Ajuste realizado',
        },
      };
      mockedApi.post.mockResolvedValue(mockResponse);

      const result = await inventoryService.adjust(mockRequest);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/adjust', mockRequest);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('transfer', () => {
    it('should create a transfer', async () => {
      const mockRequest = {
        source_warehouse_id: 1,
        destination_warehouse_id: 2,
        items: [{ product_id: 1, quantity: 20 }],
        notes: 'Test transfer',
      };
      const mockResponse = {
        data: {
          success: true,
          movement_request_id: 125,
          request_number: 'TR-20240325144000',
          items_transferred: 1,
          message: 'Transferencia completada',
        },
      };
      mockedApi.post.mockResolvedValue(mockResponse);

      const result = await inventoryService.transfer(mockRequest);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/transfer', mockRequest);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle transfer with location IDs', async () => {
      const mockRequest = {
        source_warehouse_id: 1,
        destination_warehouse_id: 2,
        items: [{
          product_id: 1,
          quantity: 20,
          source_location_id: 1,
          destination_location_id: 5,
        }],
      };
      mockedApi.post.mockResolvedValue({ data: { success: true } });

      await inventoryService.transfer(mockRequest);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/transfer', mockRequest);
    });
  });

  describe('getWarehouses', () => {
    it('should get all warehouses', async () => {
      const mockResponse = {
        data: [
          { id: 1, code: 'WH-01', name: 'Warehouse 1', location: 'Location 1' },
          { id: 2, code: 'WH-02', name: 'Warehouse 2', location: 'Location 2' },
        ],
      };
      mockedApi.get.mockResolvedValue(mockResponse);

      const result = await inventoryService.getWarehouses();

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/warehouses');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getAvailableLocations', () => {
    it('should get available locations for a warehouse', async () => {
      const mockResponse = {
        data: [
          { id: 1, code: 'A-01-01', name: 'Location 1', has_capacity: true },
          { id: 2, code: 'A-01-02', name: 'Location 2', has_capacity: true },
        ],
      };
      mockedApi.get.mockResolvedValue(mockResponse);

      const result = await inventoryService.getAvailableLocations(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/locations/available', { params: { warehouse_id: 1 } });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getProductLocations', () => {
    it('should get locations for a product', async () => {
      const mockResponse = {
        data: [
          { location_id: 1, location_code: 'A-01-01', quantity: 100 },
        ],
      };
      mockedApi.get.mockResolvedValue(mockResponse);

      const result = await inventoryService.getProductLocations(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/product/1/locations', expect.any(Object));
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter by warehouse', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await inventoryService.getProductLocations(1, 2);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/product/1/locations', { params: { warehouse_id: 2 } });
    });
  });

  describe('getAdjustmentHistory', () => {
    it('should get adjustment history', async () => {
      const mockResponse = {
        data: {
          adjustments: [
            {
              id: 1,
              request_number: 'ADJ-001',
              product_id: 1,
              product_name: 'Test Product',
              quantity_change: -5,
            },
          ],
          total: 1,
          page: 1,
          page_size: 20,
        },
      };
      mockedApi.get.mockResolvedValue(mockResponse);

      const result = await inventoryService.getAdjustmentHistory();

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/adjustments', { params: undefined });
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter by product_id', async () => {
      mockedApi.get.mockResolvedValue({ data: { adjustments: [], total: 0, page: 1, page_size: 20 } });

      await inventoryService.getAdjustmentHistory({ product_id: 1 });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/adjustments', { params: { product_id: 1 } });
    });

    it('should filter by warehouse_id and date range', async () => {
      mockedApi.get.mockResolvedValue({ data: { adjustments: [], total: 0, page: 1, page_size: 20 } });

      await inventoryService.getAdjustmentHistory({
        warehouse_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/adjustments', {
        params: {
          warehouse_id: 1,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        },
      });
    });
  });

  describe('getTransferHistory', () => {
    it('should get transfer history', async () => {
      const mockResponse = {
        data: {
          transfers: [
            {
              id: 1,
              request_number: 'TR-001',
              product_id: 1,
              source_warehouse_id: 1,
              destination_warehouse_id: 2,
              quantity: 20,
            },
          ],
          total: 1,
          page: 1,
          page_size: 20,
        },
      };
      mockedApi.get.mockResolvedValue(mockResponse);

      const result = await inventoryService.getTransferHistory();

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/transfers', { params: undefined });
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter by source and destination warehouses', async () => {
      mockedApi.get.mockResolvedValue({ data: { transfers: [], total: 0, page: 1, page_size: 20 } });

      await inventoryService.getTransferHistory({
        source_warehouse_id: 1,
        destination_warehouse_id: 2,
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/transfers', {
        params: {
          source_warehouse_id: 1,
          destination_warehouse_id: 2,
        },
      });
    });

    it('should paginate results', async () => {
      mockedApi.get.mockResolvedValue({ data: { transfers: [], total: 0, page: 2, page_size: 10 } });

      await inventoryService.getTransferHistory({ page: 2, page_size: 10 });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/transfers', {
        params: { page: 2, page_size: 10 },
      });
    });
  });

  describe('getLocationCapacity', () => {
    it('should get location capacity', async () => {
      const mockResponse = {
        data: {
          id: 1,
          code: 'A-01-01',
          name: 'Location 1',
          capacity: 100,
          current_occupancy: 45,
          available: 55,
        },
      };
      mockedApi.get.mockResolvedValue(mockResponse);

      const result = await inventoryService.getLocationCapacity(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/locations/1/capacity');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateLocationCapacity', () => {
    it('should update location capacity', async () => {
      const mockResponse = {
        data: {
          id: 1,
          code: 'A-01-01',
          capacity: 150,
          current_occupancy: 45,
          available: 105,
        },
      };
      mockedApi.put.mockResolvedValue(mockResponse);

      const result = await inventoryService.updateLocationCapacity(1, 150);

      expect(mockedApi.put).toHaveBeenCalledWith('/inventory/locations/1/capacity', { capacity: 150 });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Cycle Count', () => {
    const mockCycleCountResponse = {
      data: {
        id: 1,
        request_number: 'CC-20240325143022',
        warehouse_id: 1,
        warehouse_name: 'Almacén Central',
        status: 'PENDING',
        priority: 'NORMAL',
        total_items: 15,
        items_counted: 0,
        items_with_variance: 0,
      },
    };

    it('should create a cycle count', async () => {
      mockedApi.post.mockResolvedValue(mockCycleCountResponse);

      const result = await inventoryService.createCycleCount({
        warehouse_id: 1,
        priority: 'NORMAL',
        notes: 'Test cycle count',
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/cycle-count', {
        warehouse_id: 1,
        priority: 'NORMAL',
        notes: 'Test cycle count',
      });
      expect(result).toEqual(mockCycleCountResponse.data);
    });

    it('should get cycle counts', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          counts: [mockCycleCountResponse.data],
          total: 1,
          page: 1,
          page_size: 20,
        },
      });

      const result = await inventoryService.getCycleCounts({ warehouse_id: 1 });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/cycle-count', {
        params: { warehouse_id: 1 },
      });
      expect(result.counts).toHaveLength(1);
    });

    it('should get cycle count detail', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          ...mockCycleCountResponse.data,
          items: [
            {
              id: 1,
              product_id: 1,
              product_name: 'Test Product',
              location_code: 'A-01-01',
              system_stock: 100,
              counted_stock: null,
            },
          ],
        },
      });

      const result = await inventoryService.getCycleCountDetail(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/cycle-count/1');
      expect(result.items).toHaveLength(1);
    });

    it('should record a count', async () => {
      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Count recorded',
          item: { id: 1, counted_stock: 50 },
        },
      });

      const result = await inventoryService.recordCycleCount(1, 1, 50, 'Test notes');

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/cycle-count/1/record', {
        item_id: 1,
        counted_stock: 50,
        notes: 'Test notes',
      });
      expect(result.success).toBe(true);
    });

    it('should complete a cycle count', async () => {
      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Cycle count completed',
        },
      });

      const result = await inventoryService.completeCycleCount(1);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/cycle-count/1/complete');
      expect(result.success).toBe(true);
    });

    it('should approve variances', async () => {
      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Processed 1 approvals',
          results: { approved: [1], rejected: [], adjustments_created: 1 },
        },
      });

      const result = await inventoryService.approveVariances(1, [
        { item_id: 1, approve: true, apply_adjustment: true },
      ]);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/cycle-count/1/approve-variances', {
        approvals: [{ item_id: 1, approve: true, apply_adjustment: true }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Reports', () => {
    const mockExpiringProductsResponse = {
      data: {
        products: [
          {
            product_id: 1,
            product_name: 'Test Product',
            product_sku: 'TEST-001',
            batch_number: 'BATCH-001',
            warehouse_name: 'Warehouse 1',
            location_code: 'A-01-01',
            quantity: 50,
            expiration_date: '2024-04-15',
            days_until_expiry: 15,
            is_expired: false,
          },
        ],
        total: 1,
        expired_count: 0,
        expiring_soon_count: 1,
      },
    };

    it('should get expiring products', async () => {
      mockedApi.get.mockResolvedValue(mockExpiringProductsResponse);

      const result = await inventoryService.getExpiringProducts({ days_ahead: 30 });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/reports/expiring', {
        params: { days_ahead: 30 },
      });
      expect(result.products).toHaveLength(1);
      expect(result.expiring_soon_count).toBe(1);
    });

    it('should filter expiring products by warehouse', async () => {
      mockedApi.get.mockResolvedValue({ data: { products: [], total: 0, expired_count: 0, expiring_soon_count: 0 } });

      await inventoryService.getExpiringProducts({ warehouse_id: 1, days_ahead: 60 });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/reports/expiring', {
        params: { warehouse_id: 1, days_ahead: 60 },
      });
    });

    it('should paginate expiring products', async () => {
      mockedApi.get.mockResolvedValue({ data: { products: [], total: 0, expired_count: 0, expiring_soon_count: 0 } });

      await inventoryService.getExpiringProducts({ page: 1, page_size: 20 });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/reports/expiring', {
        params: { page: 1, page_size: 20 },
      });
    });

    const mockLowStockResponse = {
      data: {
        products: [
          {
            product_id: 1,
            product_name: 'Low Stock Product',
            product_sku: 'LOW-001',
            category: 'Category 1',
            current_stock: 5,
            min_stock: 10,
            max_stock: 50,
            stock_percentage: 50,
            warehouse_name: 'Warehouse 1',
            last_updated: null,
          },
        ],
        total: 1,
        critical_count: 0,
        warning_count: 1,
      },
    };

    it('should get low stock products', async () => {
      mockedApi.get.mockResolvedValue(mockLowStockResponse);

      const result = await inventoryService.getLowStockProducts();

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/reports/low-stock', { params: undefined });
      expect(result.products).toHaveLength(1);
      expect(result.warning_count).toBe(1);
    });

    it('should filter low stock by warehouse', async () => {
      mockedApi.get.mockResolvedValue({ data: { products: [], total: 0, critical_count: 0, warning_count: 0 } });

      await inventoryService.getLowStockProducts({ warehouse_id: 1 });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/reports/low-stock', {
        params: { warehouse_id: 1 },
      });
    });

    it('should paginate low stock products', async () => {
      mockedApi.get.mockResolvedValue({ data: { products: [], total: 0, critical_count: 0, warning_count: 0 } });

      await inventoryService.getLowStockProducts({ page: 2, page_size: 10 });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/reports/low-stock', {
        params: { page: 2, page_size: 10 },
      });
    });

    const mockInventorySummaryResponse = {
      data: {
        total_products: 100,
        total_stock: 5000,
        total_value: null,
        low_stock_count: 10,
        expiring_soon_count: 5,
        out_of_stock_count: 2,
        by_category: [
          { category_id: 1, category_name: 'Category 1', total_products: 50, total_stock: 2500, total_value: null },
        ],
        by_warehouse: [
          {
            warehouse_id: 1,
            warehouse_name: 'Warehouse 1',
            warehouse_code: 'WH-01',
            total_products: 50,
            total_stock: 2500,
            low_stock_count: 5,
            expiring_soon_count: 3,
          },
        ],
      },
    };

    it('should get inventory summary', async () => {
      mockedApi.get.mockResolvedValue(mockInventorySummaryResponse);

      const result = await inventoryService.getInventorySummary();

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/reports/summary', { params: undefined });
      expect(result.total_products).toBe(100);
      expect(result.low_stock_count).toBe(10);
      expect(result.by_category).toHaveLength(1);
      expect(result.by_warehouse).toHaveLength(1);
    });

    it('should filter inventory summary by warehouse', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          total_products: 50,
          total_stock: 2500,
          low_stock_count: 5,
          expiring_soon_count: 3,
          out_of_stock_count: 1,
          by_category: [],
          by_warehouse: [],
        },
      });

      await inventoryService.getInventorySummary({ warehouse_id: 1 });

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/reports/summary', {
        params: { warehouse_id: 1 },
      });
    });
  });
});
