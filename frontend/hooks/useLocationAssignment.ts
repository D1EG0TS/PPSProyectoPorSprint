import { useState } from 'react';
import { locationService } from '../services/locationService';
import { ProductRelocationRequest } from '../types/location';

export const useLocationAssignment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignProduct = async (
    productId: number, 
    warehouseId: number, 
    locationId: number, 
    quantity: number,
    batchId?: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await locationService.assignProduct(productId, {
        location_id: locationId,
        warehouse_id: warehouseId,
        quantity,
        batch_id: batchId,
        assignment_type: 'manual'
      });
      return result;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error assigning product to location');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const relocateProduct = async (productId: number, data: ProductRelocationRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await locationService.relocateProduct(productId, data);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error relocating product');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    assignProduct,
    relocateProduct,
    loading,
    error
  };
};
