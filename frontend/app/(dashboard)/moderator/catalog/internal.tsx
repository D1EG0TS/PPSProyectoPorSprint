import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Searchbar, Button, Chip } from 'react-native-paper';
import { InternalCatalogTable } from '@/components/catalog/internal/InternalCatalogTable';
import { useInternalCatalog } from '@/hooks/useInternalCatalog';
import { catalogService } from '@/services/catalogService';
import { CatalogPermissions } from '@/types/catalog';
import { Colors } from '@/constants/Colors';

export default function InternalCatalogScreen() {
  const { 
    items, 
    loading, 
    error, 
    filters, 
    updateFilters, 
    refresh, 
    metrics, 
    exportData 
  } = useInternalCatalog();

  const [permissions, setPermissions] = useState<CatalogPermissions>({
    can_see_stock: false,
    can_see_locations: false,
    can_see_costs: false,
    can_add_to_request: false,
    can_export_data: false
  });

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const perms = await catalogService.getPermissions();
      setPermissions(perms);
    } catch (e) {
      console.error("Failed to load permissions", e);
    }
  };

  const handleAdjustStock = (item: any) => {
    // TODO: Navigate to adjust stock screen
    console.log("Adjust stock for", item.id);
  };

  const handleRequest = (item: any) => {
    // TODO: Navigate to request creation with item pre-selected
    console.log("Request item", item.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Internal Catalog</Text>
        {permissions.can_export_data && (
          <Button mode="outlined" icon="export" onPress={exportData}>
            Export
          </Button>
        )}
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricItem}>
          <Text variant="labelMedium">Total Products</Text>
          <Text variant="headlineSmall">{metrics.totalProducts}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text variant="labelMedium">Low Stock</Text>
          <Text variant="headlineSmall" style={{ color: metrics.lowStockCount > 0 ? Colors.error : Colors.text }}>
            {metrics.lowStockCount}
          </Text>
        </View>
        {permissions.can_see_costs && (
           <View style={styles.metricItem}>
            <Text variant="labelMedium">Inventory Value</Text>
            <Text variant="headlineSmall">${metrics.inventoryValue.toLocaleString()}</Text>
          </View>
        )}
      </View>

      <View style={styles.filters}>
        <Searchbar
          placeholder="Search SKU, Name..."
          value={filters.search}
          onChangeText={(text) => updateFilters({ search: text })}
          style={styles.searchbar}
        />
        
        <View style={styles.chips}>
          <Chip 
            selected={filters.lowStock} 
            onPress={() => updateFilters({ lowStock: !filters.lowStock })}
            showSelectedOverlay
            style={styles.chip}
          >
            Low Stock
          </Chip>
          <Chip 
            selected={filters.noMovement} 
            onPress={() => updateFilters({ noMovement: !filters.noMovement })}
            showSelectedOverlay
            style={styles.chip}
          >
            No Movement
          </Chip>
           <Chip 
            selected={filters.needsReorder} 
            onPress={() => updateFilters({ needsReorder: !filters.needsReorder })}
            showSelectedOverlay
            style={styles.chip}
          >
            Reorder
          </Chip>
        </View>
      </View>

      {error ? (
        <View style={styles.error}>
          <Text style={{ color: Colors.error }}>{error}</Text>
          <Button onPress={refresh}>Retry</Button>
        </View>
      ) : (
        <InternalCatalogTable 
          items={items} 
          loading={loading}
          permissions={permissions}
          onAdjustStock={handleAdjustStock}
          onRequest={handleRequest}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    elevation: 2,
  },
  metricItem: {
    alignItems: 'center',
  },
  filters: {
    gap: 10,
  },
  searchbar: {
    backgroundColor: 'white',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'white',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
