import { warehouseLayoutService } from '../../services/warehouseLayoutService';
import api from '../../services/api';

jest.mock('../../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('warehouseLayoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listLayouts', () => {
    it('should return list of layouts', async () => {
      const mockLayouts = [
        {
          id: 1,
          warehouse_id: 1,
          name: 'Layout 1',
          grid_rows: 10,
          grid_cols: 10,
          cells: [],
        },
      ];
      mockedApi.get.mockResolvedValue({ data: mockLayouts });

      const result = await warehouseLayoutService.listLayouts();

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/layout/', { params: { skip: 0, limit: 100 } });
      expect(result).toEqual(mockLayouts);
    });

    it('should accept pagination parameters', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await warehouseLayoutService.listLayouts(10, 50);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/layout/', { params: { skip: 10, limit: 50 } });
    });
  });

  describe('getLayout', () => {
    it('should return layout by id', async () => {
      const mockLayout = {
        id: 1,
        warehouse_id: 1,
        name: 'Test Layout',
        grid_rows: 10,
        grid_cols: 10,
        cell_width: 100,
        cell_height: 100,
        cells: [
          {
            id: 1,
            layout_id: 1,
            row: 0,
            col: 0,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            cell_type: 'storage',
            name: 'Cell 1',
            color: null,
            occupancy_level: 'empty',
            occupancy_percentage: 0,
            linked_location_id: null,
            linked_aisle: null,
            linked_rack: null,
            linked_shelf: null,
            metadata: null,
            created_at: 1711392000,
            updated_at: null,
          },
        ],
      };
      mockedApi.get.mockResolvedValue({ data: mockLayout });

      const result = await warehouseLayoutService.getLayout(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/layout/1');
      expect(result).toEqual(mockLayout);
      expect(result.cells).toHaveLength(1);
    });
  });

  describe('getLayoutByWarehouse', () => {
    it('should return layout for warehouse', async () => {
      const mockLayout = {
        id: 1,
        warehouse_id: 1,
        name: 'Warehouse 1 Layout',
        cells: [],
      };
      mockedApi.get.mockResolvedValue({ data: mockLayout });

      const result = await warehouseLayoutService.getLayoutByWarehouse(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/layout/warehouse/1');
      expect(result).toEqual(mockLayout);
    });
  });

  describe('createLayout', () => {
    it('should create a new layout', async () => {
      const mockRequest = {
        warehouse_id: 1,
        name: 'New Layout',
        grid_rows: 15,
        grid_cols: 15,
      };
      const mockResponse = {
        id: 2,
        ...mockRequest,
        cell_width: 100,
        cell_height: 100,
        is_active: true,
        created_by: 1,
        created_at: 1711392000,
      };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await warehouseLayoutService.createLayout(mockRequest);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/layout/', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateLayout', () => {
    it('should update layout properties', async () => {
      const mockUpdate = {
        name: 'Updated Layout',
        description: 'New description',
      };
      const mockResponse = {
        id: 1,
        name: 'Updated Layout',
        description: 'New description',
        grid_rows: 10,
        grid_cols: 10,
      };
      mockedApi.put.mockResolvedValue({ data: mockResponse });

      const result = await warehouseLayoutService.updateLayout(1, mockUpdate);

      expect(mockedApi.put).toHaveBeenCalledWith('/inventory/layout/1', mockUpdate);
      expect(result.name).toBe('Updated Layout');
    });
  });

  describe('deleteLayout', () => {
    it('should delete layout', async () => {
      mockedApi.delete.mockResolvedValue({ data: undefined });

      await warehouseLayoutService.deleteLayout(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/inventory/layout/1');
    });
  });

  describe('cells', () => {
    it('should list cells for layout', async () => {
      const mockCells = [
        { id: 1, row: 0, col: 0, cell_type: 'storage' },
        { id: 2, row: 0, col: 1, cell_type: 'rack' },
      ];
      mockedApi.get.mockResolvedValue({ data: mockCells });

      const result = await warehouseLayoutService.listCells(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/layout/1/cells');
      expect(result).toHaveLength(2);
    });

    it('should create a cell', async () => {
      const mockCell = {
        id: 1,
        layout_id: 1,
        row: 0,
        col: 0,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        cell_type: 'storage',
        name: 'Test Cell',
        occupancy_level: 'empty',
        occupancy_percentage: 0,
        created_at: 1711392000,
      };
      mockedApi.post.mockResolvedValue({ data: mockCell });

      const result = await warehouseLayoutService.createCell(1, {
        row: 0,
        col: 0,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        cell_type: 'storage',
        name: 'Test Cell',
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/layout/1/cells', expect.any(Object));
      expect(result.name).toBe('Test Cell');
    });

    it('should update a cell', async () => {
      const mockUpdate = {
        cell_type: 'rack',
        name: 'Updated Cell',
      };
      const mockResponse = {
        id: 1,
        cell_type: 'rack',
        name: 'Updated Cell',
      };
      mockedApi.put.mockResolvedValue({ data: mockResponse });

      const result = await warehouseLayoutService.updateCell(1, 1, mockUpdate);

      expect(mockedApi.put).toHaveBeenCalledWith('/inventory/layout/1/cells/1', mockUpdate);
      expect(result.cell_type).toBe('rack');
    });

    it('should delete a cell', async () => {
      mockedApi.delete.mockResolvedValue({ data: undefined });

      await warehouseLayoutService.deleteCell(1, 1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/inventory/layout/1/cells/1');
    });
  });

  describe('generateLayout', () => {
    it('should generate empty grid', async () => {
      const mockCells = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        layout_id: 1,
        row: Math.floor(i / 5),
        col: i % 5,
        x: (i % 5) * 100,
        y: Math.floor(i / 5) * 100,
        width: 100,
        height: 100,
        cell_type: 'empty',
        occupancy_level: 'empty',
        occupancy_percentage: 0,
        created_at: 1711392000,
      }));
      mockedApi.post.mockResolvedValue({ data: mockCells });

      const result = await warehouseLayoutService.generateLayout(1, { rows: 5, cols: 5 });

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/layout/1/generate', { rows: 5, cols: 5 });
      expect(result).toHaveLength(25);
    });
  });

  describe('heatmap', () => {
    it('should return heatmap data', async () => {
      const mockHeatmap = {
        layout_id: 1,
        warehouse_id: 1,
        cells: [
          { row: 0, col: 0, occupancy_percentage: 50, occupancy_level: 'medium', product_count: 5 },
          { row: 0, col: 1, occupancy_percentage: 100, occupancy_level: 'full', product_count: 10 },
        ],
        average_occupancy: 75,
        total_capacity: 100,
        total_occupancy: 75,
      };
      mockedApi.get.mockResolvedValue({ data: mockHeatmap });

      const result = await warehouseLayoutService.getHeatmap(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/layout/1/heatmap');
      expect(result.average_occupancy).toBe(75);
      expect(result.cells).toHaveLength(2);
    });
  });

  describe('export/import', () => {
    it('should export layout', async () => {
      const mockExport = {
        name: 'Test Layout',
        description: null,
        grid_rows: 10,
        grid_cols: 10,
        cell_width: 100,
        cell_height: 100,
        cells: [],
        exported_at: '2024-03-25 12:00:00',
      };
      mockedApi.get.mockResolvedValue({ data: mockExport });

      const result = await warehouseLayoutService.exportLayout(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/layout/1/export');
      expect(result.name).toBe('Test Layout');
      expect(result.exported_at).toBeDefined();
    });

    it('should import layout', async () => {
      const mockImport = {
        name: 'Imported Layout',
        description: 'From JSON',
        grid_rows: 5,
        grid_cols: 5,
        cell_width: 50,
        cell_height: 50,
        cells: [],
      };
      const mockResponse = {
        id: 3,
        warehouse_id: 1,
        name: 'Imported Layout',
        grid_rows: 5,
        grid_cols: 5,
      };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await warehouseLayoutService.importLayout(1, mockImport);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/layout/import?warehouse_id=1', mockImport);
      expect(result.name).toBe('Imported Layout');
    });
  });
});
