import { labelService, LabelType, LabelSize } from '../../services/labelService';
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

describe('labelService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listTemplates', () => {
    it('should return list of templates', async () => {
      const mockTemplates = [
        { id: 1, name: 'Template 1', label_type: 'qr', size: 'medium' },
        { id: 2, name: 'Template 2', label_type: 'code128', size: 'small' },
      ];
      mockedApi.get.mockResolvedValue({ data: mockTemplates });

      const result = await labelService.listTemplates();

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/labels/templates');
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', async () => {
      const mockTemplate = { id: 1, name: 'Test Template', label_type: 'qr' };
      mockedApi.get.mockResolvedValue({ data: mockTemplate });

      const result = await labelService.getTemplate(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/inventory/labels/templates/1');
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const mockRequest = { name: 'New Template', label_type: 'qr' as LabelType };
      const mockResponse = { id: 1, ...mockRequest, size: 'medium' as LabelSize };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await labelService.createTemplate(mockRequest);

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/labels/templates', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const mockUpdate = { name: 'Updated Template' };
      const mockResponse = { id: 1, name: 'Updated Template', label_type: 'qr' };
      mockedApi.put.mockResolvedValue({ data: mockResponse });

      const result = await labelService.updateTemplate(1, mockUpdate);

      expect(mockedApi.put).toHaveBeenCalledWith('/inventory/labels/templates/1', mockUpdate);
      expect(result.name).toBe('Updated Template');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      mockedApi.delete.mockResolvedValue({ data: undefined });

      await labelService.deleteTemplate(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/inventory/labels/templates/1');
    });
  });

  describe('generateProductLabelUrl', () => {
    it('should generate URL with product id', () => {
      const url = labelService.generateProductLabelUrl(123);
      
      expect(url).toContain('/inventory/labels/product/123');
    });

    it('should include template_id in URL', () => {
      const url = labelService.generateProductLabelUrl(123, 1);
      
      expect(url).toContain('template_id=1');
    });

    it('should include label_type in URL', () => {
      const url = labelService.generateProductLabelUrl(123, undefined, 'code128');
      
      expect(url).toContain('label_type=code128');
    });
  });

  describe('generateLocationLabelUrl', () => {
    it('should generate URL with location id', () => {
      const url = labelService.generateLocationLabelUrl(456);
      
      expect(url).toContain('/inventory/labels/location/456');
    });
  });

  describe('generateCustomLabel', () => {
    it('should generate custom label', async () => {
      const mockData = {
        product_name: 'Test Product',
        sku: 'SKU-001',
        barcode: '1234567890',
      };
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      mockedApi.post.mockResolvedValue({ data: mockBlob });

      const result = await labelService.generateCustomLabel(mockData, undefined, 'qr');

      expect(mockedApi.post).toHaveBeenCalledWith('/inventory/labels/generate', {
        data: mockData,
        template_id: undefined,
        label_type: 'qr',
      }, { responseType: 'blob' });
      expect(result).toEqual(mockBlob);
    });
  });
});
