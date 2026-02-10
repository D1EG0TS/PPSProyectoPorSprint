import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWebSocketClient, ConnectionStatus } from '../services/websocketClient';

declare const process: any;

// Temporary fallback API URL if needed, but we rely on existing config
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

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
    userId?: number // Pass user ID for WS connection
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
    if (!productId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (warehouseId) params.append('warehouse_id', warehouseId.toString());
      if (locationId) params.append('location_id', locationId.toString());
      
      const response = await fetch(`${API_URL}/api/v1/stock/current/${productId}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch stock');
      
      const result: StockData = await response.json();
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
    
    loadCache();
    fetchStock();
  }, [fetchStock, getCacheKey, productId]);

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
                 // Update state directly
                 setStock(updateData.new_balance);
                setData((prev: StockData | null) => {
                    const newQuantity = Number(updateData.new_balance);
                    const prodId = Number(updateData.product_id);
                    
                    if (!prev) {
                        const newData: StockData = {
                            product_id: prodId,
                            quantity: newQuantity
                        };
                        // Cache update for fresh data
                        AsyncStorage.setItem(getCacheKey(), JSON.stringify(newData)).catch(console.warn);
                        return newData;
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
