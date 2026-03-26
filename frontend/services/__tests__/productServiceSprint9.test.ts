import { 
  getConditions, createCondition, updateCondition, deleteCondition,
  getProductBatches, updateProductBatch, deleteProductBatch,
  Condition, ProductBatch
} from '../../services/productService';
import api from '../../services/api';

jest.mock('../../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('Condition CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConditions', () => {
    it('should return list of conditions', async () => {
      const mockConditions = [
        { id: 1, name: 'Nuevo', description: 'Producto nuevo', is_active: true },
        { id: 2, name: 'Usado', description: 'Producto usado', is_active: true },
      ];
      mockedApi.get.mockResolvedValue({ data: mockConditions });

      const result = await getConditions();

      expect(mockedApi.get).toHaveBeenCalledWith('/products/conditions/', { params: undefined });
      expect(result).toHaveLength(2);
    });

    it('should pass include_inactive param', async () => {
      const mockConditions = [{ id: 1, name: 'Nuevo', is_active: true }];
      mockedApi.get.mockResolvedValue({ data: mockConditions });

      await getConditions({ include_inactive: true });

      expect(mockedApi.get).toHaveBeenCalledWith('/products/conditions/', {
        params: { include_inactive: true },
      });
    });
  });

  describe('createCondition', () => {
    it('should create a new condition', async () => {
      const mockCondition = { id: 1, name: 'Reacondicionado', is_active: true };
      mockedApi.post.mockResolvedValue({ data: mockCondition });

      const result = await createCondition({ name: 'Reacondicionado' });

      expect(mockedApi.post).toHaveBeenCalledWith('/products/conditions/', { name: 'Reacondicionado' });
      expect(result.name).toBe('Reacondicionado');
    });
  });

  describe('updateCondition', () => {
    it('should update a condition', async () => {
      const mockCondition = { id: 1, name: 'Actualizado', is_active: true };
      mockedApi.put.mockResolvedValue({ data: mockCondition });

      const result = await updateCondition(1, { name: 'Actualizado' });

      expect(mockedApi.put).toHaveBeenCalledWith('/products/conditions/1', { name: 'Actualizado' });
      expect(result.name).toBe('Actualizado');
    });
  });

  describe('deleteCondition', () => {
    it('should soft delete a condition', async () => {
      mockedApi.delete.mockResolvedValue({ data: { success: true } });

      await deleteCondition(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/products/conditions/1');
    });
  });
});

describe('Batch Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductBatches', () => {
    it('should return batches for a product', async () => {
      const mockBatches = [
        { id: 1, product_id: 1, batch_number: 'BATCH001', quantity: 100 },
        { id: 2, product_id: 1, batch_number: 'BATCH002', quantity: 50 },
      ];
      mockedApi.get.mockResolvedValue({ data: mockBatches });

      const result = await getProductBatches(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/products/1/batches', { params: undefined });
      expect(result).toHaveLength(2);
    });

    it('should pass pagination params', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await getProductBatches(1, { skip: 10, limit: 20 });

      expect(mockedApi.get).toHaveBeenCalledWith('/products/1/batches', {
        params: { skip: 10, limit: 20 },
      });
    });
  });

  describe('updateProductBatch', () => {
    it('should update a batch', async () => {
      const mockBatch = { id: 1, batch_number: 'UPDATED', quantity: 150 };
      mockedApi.put.mockResolvedValue({ data: mockBatch });

      const result = await updateProductBatch(1, { batch_number: 'UPDATED', quantity: 150 });

      expect(mockedApi.put).toHaveBeenCalledWith('/products/batches/1', {
        batch_number: 'UPDATED',
        quantity: 150,
      });
      expect(result.batch_number).toBe('UPDATED');
    });

    it('should allow updating dates', async () => {
      const mockBatch = { id: 1, batch_number: 'BATCH001', manufactured_date: '2024-01-01', expiration_date: '2025-01-01' };
      mockedApi.put.mockResolvedValue({ data: mockBatch });

      const result = await updateProductBatch(1, {
        manufactured_date: '2024-01-01',
        expiration_date: '2025-01-01',
      });

      expect(mockedApi.put).toHaveBeenCalledWith('/products/batches/1', {
        manufactured_date: '2024-01-01',
        expiration_date: '2025-01-01',
      });
    });
  });

  describe('deleteProductBatch', () => {
    it('should delete a batch', async () => {
      mockedApi.delete.mockResolvedValue({ data: { success: true } });

      await deleteProductBatch(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/products/batches/1');
    });
  });
});
