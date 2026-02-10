import { useState, useCallback, useEffect } from 'react';
import { catalogService } from '../services/catalogService';
import { InternalCatalogItem, AdminCatalogItem } from '../types/catalog';
import { useAuth } from './useAuth';
import { getWebSocketClient } from '../services/websocketClient';

export const useInternalCatalog = () => {
  const [items, setItems] = useState<(InternalCatalogItem | AdminCatalogItem)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    warehouseId: null as number | null,
    lowStock: false,
    noMovement: false,
    needsReorder: false,
  });

  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    inventoryValue: 0,
  });

  const { user } = useAuth();

  const calculateMetrics = (data: (InternalCatalogItem | AdminCatalogItem)[]) => {
    let lowStock = 0;
    let value = 0;

    data.forEach(item => {
        if ('min_stock' in item && 'total_stock' in item) {
            if ((item.total_stock || 0) <= (item.min_stock || 0)) {
                lowStock++;
            }
        }
        if ('cost' in item && 'total_stock' in item) {
             value += (item.total_stock || 0) * ((item as AdminCatalogItem).cost || 0);
        }
    });

    setMetrics({
        totalProducts: data.length,
        lowStockCount: lowStock,
        inventoryValue: value
    });
  };

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all items (or paginated)
      // Currently backend supports search, skip, limit
      const data = await catalogService.getInternalCatalog(0, 1000, filters.search);
      
      calculateMetrics(data);

      let filteredData = data;

      // Client-side filtering
      if (filters.warehouseId) {
        filteredData = filteredData.filter(item => {
            // Check if item has stock in specific warehouse
            // AdminCatalogItem and InternalCatalogItem have stock_by_warehouse
            if ('stock_by_warehouse' in item && Array.isArray(item.stock_by_warehouse)) {
                return item.stock_by_warehouse.some(wh => wh.warehouse_id === filters.warehouseId && wh.quantity > 0);
            }
            return false;
        });
      }

      if (filters.lowStock) {
          filteredData = filteredData.filter(item => {
              if ('min_stock' in item && 'total_stock' in item) {
                  return (item.total_stock || 0) <= (item.min_stock || 0);
              }
              return false;
          });
      }

      if (filters.needsReorder) {
           filteredData = filteredData.filter(item => {
              if ('needs_reorder' in item) {
                  return item.needs_reorder;
              }
              return false;
          });
      }
      
      // 'noMovement' would typically require last_movement_date check, 
      // ensuring it's older than X days. For now, we skip or assume logic if field exists.
      if (filters.noMovement) {
          // Placeholder logic: if total_stock > 0 but no recent movement (needs backend support usually)
          // or simply items with 0 movement in period.
          // Let's assume we filter items with NO movements recorded if we had that info.
          // For now, ignoring to avoid empty list if logic isn't clear.
      }

      setItems(filteredData);
    } catch (err: any) {
      setError(err.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;
    const client = getWebSocketClient(user.id);

    const handleUpdate = (updateData: any) => {
        setItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === updateData.product_id) {
                    let newStockByWh = [...(item.stock_by_warehouse || [])];

                    if (updateData.warehouse_id) {
                        const idx = newStockByWh.findIndex(sw => sw.warehouse_id === updateData.warehouse_id);
                        if (idx >= 0) {
                            newStockByWh[idx] = { ...newStockByWh[idx], quantity: updateData.new_balance };
                        } else {
                             newStockByWh.push({ warehouse_id: updateData.warehouse_id, warehouse_name: 'Unknown', quantity: updateData.new_balance });
                        }
                        
                        const newTotal = newStockByWh.reduce((sum, sw) => sum + sw.quantity, 0);
                        
                        return {
                            ...item,
                            total_stock: newTotal,
                            stock_by_warehouse: newStockByWh
                        };
                    }
                }
                return item;
            });
        });
    };

    client.subscribe('stock_updated', handleUpdate);
    return () => client.unsubscribe('stock_updated', handleUpdate);
  }, [user?.id]);

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const exportData = async () => {
      // Placeholder for export functionality
      console.log('Exporting data:', items);
      // In real app: generate CSV/Excel and share/download
  };

  return {
    items,
    loading,
    error,
    filters,
    updateFilters,
    refresh: loadCatalog,
    metrics,
    exportData
  };
};
