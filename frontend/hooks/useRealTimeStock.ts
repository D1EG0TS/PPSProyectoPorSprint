import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { getWebSocketClient, ConnectionStatus } from '../services/websocketClient';

export interface StockData {
  product_id: number;
  quantity: number;
  warehouse_id?: number;
  location_id?: number;
}

export interface UseRealTimeStockResult {
  stock: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  data: StockData | null;
  isConnected: boolean;
}

export const useRealTimeStock = (
    productId?: number, 
    warehouseId?: number, 
    locationId?: number, 
    pollingInterval: number = 0, // Default 0 means disable polling if WS is active
    userId?: number, // Pass user ID for WS connection
    options: { enabled?: boolean } = { enabled: true }
): UseRealTimeStockResult => {
  const [data, setData] = useState<StockData | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);

  const getCacheKey = useCallback(() => {
    return `stock_cache_${productId}_${warehouseId || 'all'}_${locationId || 'all'}`;
  }, [productId, warehouseId, locationId]);

  const fetchStock = useCallback(async () => {
    if (!productId || !options.enabled) return;
    try {
      setLoading(true);
      
      const response = await api.get<StockData>(`/stock/current/${productId}`, {
        params: {
          warehouse_id: warehouseId,
          location_id: locationId
        }
      });
      
      const result = response.data;
      setData(result);
      setStock(result.quantity);
      setError(null);
      
      // Update Cache
      await AsyncStorage.setItem(getCacheKey(), JSON.stringify(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [productId, warehouseId, locationId, getCacheKey]);

  // Initial Fetch & Cache Load
  useEffect(() => {
    const loadCache = async () => {
        if (!productId) return;
        try {
            const cached = await AsyncStorage.getItem(getCacheKey());
            if (cached) {
                const parsed: StockData = JSON.parse(cached);
                setData(parsed);
                setStock(parsed.quantity);
            }
        } catch (e) {
            console.warn('Failed to load stock cache', e);
        }
    };
    
    if (options.enabled) {
      loadCache();
      fetchStock();
    }
  }, [fetchStock, getCacheKey, productId, options.enabled]);

  // WebSocket Subscription
  useEffect(() => {
    if (!userId) return;

    const client = getWebSocketClient(userId);

    // Status listener
    const handleStatusChange = (status: ConnectionStatus) => {
        setWsStatus(status);
    };
    client.addStatusListener(handleStatusChange);

    const handleUpdate = (updateData: any) => {
        // updateData structure: { product_id, warehouse_id, location_id, new_balance, change }
        // Filter if this update is relevant to us
        if (updateData.product_id === productId) {
            // Check scope matches
            const matchesWarehouse = !warehouseId || updateData.warehouse_id === warehouseId;
            const matchesLocation = !locationId || updateData.location_id === locationId;
            
            if (matchesWarehouse && matchesLocation) {
                 const change = Number(updateData.change);
                 const newWarehouseBalance = Number(updateData.new_balance);

                 // Update state directly
                 setStock(prev => {
                     if (prev === null) {
                         fetchStock();
                         return null;
                     }
                     
                     // If we are tracking strictly the warehouse (and not a specific location), 
                     // and the update is for this warehouse, we can use the absolute balance
                     if (warehouseId && !locationId && updateData.warehouse_id === warehouseId) {
                         return newWarehouseBalance;
                     }
                     
                     // Otherwise (Global or Specific Location), we must apply the delta
                     // Global: prev + change (accumulates changes from all warehouses)
                     // Location: prev + change (accumulates changes for this location)
                     return prev + change;
                 });

                 setData((prev: StockData | null) => {
                    if (!prev) return null;
                    
                    let newQuantity = prev.quantity;
                    if (warehouseId && !locationId && updateData.warehouse_id === warehouseId) {
                         newQuantity = newWarehouseBalance;
                    } else {
                         newQuantity = prev.quantity + change;
                    }
                    
                    const updated = { ...prev, quantity: newQuantity };
                    // Cache update
                    AsyncStorage.setItem(getCacheKey(), JSON.stringify(updated)).catch(console.warn);
                    return updated;
                });
            }
        }
    };

    if (productId) {
        client.subscribe('stock_updated', handleUpdate);
    }

    return () => {
        if (productId) {
            client.unsubscribe('stock_updated', handleUpdate);
        }
        client.removeStatusListener(handleStatusChange);
    };
  }, [productId, warehouseId, locationId, userId, getCacheKey]);

  // Polling Fallback (only if interval > 0 or WS disconnected)
  useEffect(() => {
    if (!productId) return;
    
    // Fallback logic: Poll if manual interval set OR if WS is not connected (and we want realtime)
    // If pollingInterval is explicitly 0, we still fallback if WS fails, using default 10s
    // Unless we want to strictly respect 0? Usually 0 means "no polling preferred", but fallback is desirable.
    const isConnected = wsStatus === ConnectionStatus.CONNECTED;
    const shouldPoll = pollingInterval > 0 || (!isConnected && userId !== undefined);
    
    if (shouldPoll) {
      const interval = pollingInterval > 0 ? pollingInterval : 10000; // 10s fallback
      const intervalId = setInterval(fetchStock, interval);
      return () => clearInterval(intervalId);
    }
  }, [fetchStock, pollingInterval, productId, wsStatus, userId]);

  return { 
      stock, 
      loading, 
      error, 
      refresh: fetchStock, 
      data,
      isConnected: wsStatus === ConnectionStatus.CONNECTED
  };
};
