import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { DataTable, IconButton, Text, Tooltip, ActivityIndicator, List, Divider } from 'react-native-paper';
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
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (id: number) => {
    if (expandedRow === id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
    }
  };

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
              <React.Fragment key={item.id}>
              <DataTable.Row onPress={() => toggleRow(item.id)}>
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
                    <IconButton 
                      icon={expandedRow === item.id ? "chevron-up" : "chevron-down"}
                      size={20}
                      onPress={() => toggleRow(item.id)}
                    />
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
              {expandedRow === item.id && (
                  <View style={styles.expandedRow}>
                      <Text style={styles.detailTitle}>Product Details:</Text>
                      <View style={styles.detailGrid}>
                          <Text>Brand: {item.brand || '-'}</Text>
                          <Text>Model: {item.model || '-'}</Text>
                          <Text>Description: {item.description || '-'}</Text>
                          <Text>Barcode: {item.barcode || '-'}</Text>
                          <Text>Unit: {item.unit?.abbreviation || item.unit?.name || '-'}</Text>
                          {/* Add more fields here */}
                      </View>
                      <Divider style={{ marginVertical: 10 }} />
                      {!!item.image_url && (
                        <View style={{ width: 120, height: 120, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee' }}>
                          {/* Web thumbnail; for native, Image component in a conditional block would be used */}
                          {/* @ts-ignore */}
                          <img 
                            src={require('../../../services/api').getImageUrl(item.image_url)} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            alt="thumb" 
                          />
                        </View>
                      )}
                  </View>
              )}
              </React.Fragment>
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
  },
  expandedRow: {
      padding: 16,
      backgroundColor: '#f9f9f9',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
  },
  detailTitle: {
      fontWeight: 'bold',
      marginBottom: 8,
  },
  detailGrid: {
      gap: 4
  }
});
