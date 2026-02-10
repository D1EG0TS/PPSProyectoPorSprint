import { useState, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { StorageLocation } from '../types/location';
import { warehouseService } from '../services/warehouseService';

export const useLocationSearch = () => {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchByBarcode = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await locationService.searchByBarcode(barcode);
      // Ensure result is array or wrap it
      setLocations(Array.isArray(result) ? result : [result]);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Location not found');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWarehouseLocations = useCallback(async (warehouseId: number) => {
    setLoading(true);
    setError(null);
    try {
      // Cast response to StorageLocation[] as existing service might return slightly different type
      const result = await warehouseService.getLocations(warehouseId);
      // Adapt result if needed, assuming backend now returns full location objects with new fields
      setLocations(result as unknown as StorageLocation[]);
    } catch (err: any) {
      setError(err.message || 'Error loading locations');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    locations,
    searchByBarcode,
    loadWarehouseLocations,
    loading,
    error
  };
};
