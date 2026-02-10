import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { DataTable, IconButton, Text, Tooltip, ActivityIndicator } from 'react-native-paper';
import { InternalCatalogItem, AdminCatalogItem, CatalogPermissions } from '../../../types/catalog';
import { StockIndicator } from '../common/StockIndicator';
import { WarehouseStockCell } from './WarehouseStockCell';
import { LocationViewModal } from './LocationViewModal';
import { Colors } from '../../../constants/Colors';

interface InternalCatalogTableProps {
  items: (InternalCatalogItem | AdminCatalogItem)[];
  loading?: boolean;
  permissions: CatalogPermissions;
  onAdjustStock: (item: InternalCatalogItem | AdminCatalogItem) => void;
  onRequest: (item: InternalCatalogItem | AdminCatalogItem) => void;
}

export const InternalCatalogTable: React.FC<InternalCatalogTableProps> = ({
  items,
  loading = false,
  permissions,
  onAdjustStock,
  onRequest
}) => {
  const [selectedLocationItem, setSelectedLocationItem] = useState<AdminCatalogItem | null>(null);

  if (loading) {
      return (
          <View style={[styles.container, styles.centered]}>
              <ActivityIndicator size="large" />
          </View>
      );
  }

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>No items found matching filters.</Text>
      </View>
    );
  }

  // Helper to check if item is AdminCatalogItem
  const isAdminItem = (item: any): item is AdminCatalogItem => {
    return 'locations' in item;
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal>
        <View>
          <DataTable style={{ minWidth: 800 }}> 
            <DataTable.Header>
              <DataTable.Title style={{ width: 60 }}>ID</DataTable.Title>
              <DataTable.Title style={{ width: 100 }}>SKU</DataTable.Title>
              <DataTable.Title style={{ width: 200 }}>Name</DataTable.Title>
              <DataTable.Title style={{ width: 100 }}>Category</DataTable.Title>
              <DataTable.Title style={{ width: 120 }}>Stock</DataTable.Title>
              {permissions.can_see_stock && (
                 <DataTable.Title style={{ width: 150 }}>Warehouses</DataTable.Title>
              )}
              {permissions.can_see_costs && (
                <DataTable.Title numeric style={{ width: 80 }}>Cost</DataTable.Title>
              )}
              <DataTable.Title style={{ width: 150 }}>Actions</DataTable.Title>
            </DataTable.Header>

            {items.map((item) => (
              <DataTable.Row key={item.id}>
                <DataTable.Cell style={{ width: 60 }}>{item.id}</DataTable.Cell>
                <DataTable.Cell style={{ width: 100 }}>{item.sku}</DataTable.Cell>
                <DataTable.Cell style={{ width: 200 }}>{item.name}</DataTable.Cell>
                <DataTable.Cell style={{ width: 100 }}>{item.category?.name || '-'}</DataTable.Cell>
                <DataTable.Cell style={{ width: 120 }}>
                  <StockIndicator productId={item.id} minStock={item.min_stock} />
                </DataTable.Cell>
                
                {permissions.can_see_stock && (
                  <DataTable.Cell style={{ width: 150 }}>
                    <WarehouseStockCell stocks={item.stock_by_warehouse} productId={item.id} />
                  </DataTable.Cell>
                )}

                {permissions.can_see_costs && (
                  <DataTable.Cell numeric style={{ width: 80 }}>
                    {isAdminItem(item) ? `$${item.cost}` : '-'}
                  </DataTable.Cell>
                )}

                <DataTable.Cell style={{ width: 150 }}>
                  <View style={styles.actions}>
                    {permissions.can_see_locations && isAdminItem(item) && (
                      <Tooltip title="View Locations">
                        <IconButton 
                          icon="map-marker" 
                          size={20} 
                          onPress={() => setSelectedLocationItem(item)}
                        />
                      </Tooltip>
                    )}
                    
                    {permissions.can_add_to_request && (
                      <Tooltip title="Request Stock">
                        <IconButton 
                          icon="cart-plus" 
                          size={20} 
                          onPress={() => onRequest(item)}
                        />
                      </Tooltip>
                    )}

                    {/* Adjust stock button could be for Role 4/3 too depending on logic */}
                    <Tooltip title="Adjust Stock">
                       <IconButton 
                          icon="clipboard-edit" 
                          size={20} 
                          onPress={() => onAdjustStock(item)}
                       />
                    </Tooltip>
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </View>
      </ScrollView>

      {selectedLocationItem && (
        <LocationViewModal
          visible={!!selectedLocationItem}
          onDismiss={() => setSelectedLocationItem(null)}
          productName={selectedLocationItem.name}
          locations={selectedLocationItem.locations}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
