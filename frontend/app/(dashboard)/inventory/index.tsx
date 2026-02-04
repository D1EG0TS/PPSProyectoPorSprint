import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button, Chip, Menu, Portal, Modal, TextInput, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

import { ScrollableContent } from '../../../components/ScrollableContent';
import { Table, Column } from '../../../components/Table';
import { LoadingScreen } from '../../../components/LoadingScreen';
import { warehouseService, WarehouseStockItem } from '../../../services/warehouseService';
import { getProducts, Product } from '../../../services/productService';
import { Colors } from '../../../constants/Colors';

interface InventoryItem extends Product {
  current_stock: number;
}

export default function InventoryScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [showWarehouseMenu, setShowWarehouseMenu] = useState(false);
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0]);
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error cargando almacenes' });
    }
  };

  const loadData = async () => {
    if (!selectedWarehouse) return;
    
    setLoading(true);
    try {
      // 1. Load Stock for selected warehouse
      const stockData = await warehouseService.getWarehouseStock(selectedWarehouse.id);
      const stockMapObj: Record<number, number> = {};
      stockData.forEach(item => {
        stockMapObj[item.product_id] = item.quantity;
      });
      setStockMap(stockMapObj);

      // 2. Load Products (fetching all or large limit for now)
      // In a real app, we would paginate or search on backend. 
      // For this sprint, we fetch a batch and map stock.
      const productsData = await getProducts({ limit: 100, search: searchQuery });
      
      const inventoryItems: InventoryItem[] = productsData.map((p: Product) => ({
        ...p,
        current_stock: stockMapObj[p.id] || 0
      }));

      // Client-side filter for Low Stock if enabled
      // (Ideally backend should handle this)
      let finalItems = inventoryItems;
      if (showLowStock) {
        finalItems = finalItems.filter(p => p.current_stock < (p.min_stock || 0));
      }

      setProducts(finalItems);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error cargando inventario' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selectedWarehouse) {
        loadData();
      }
    }, [selectedWarehouse, searchQuery, showLowStock])
  );

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      label: 'Producto',
      renderCell: (item) => (
        <View>
          <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.name}</Text>
          <Text variant="bodySmall" style={{ color: 'gray' }}>{item.sku}</Text>
        </View>
      )
    },
    {
      key: 'current_stock',
      label: 'Stock',
      numeric: true,
      renderCell: (item) => {
        const isLow = item.current_stock < (item.min_stock || 0);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
             <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: isLow ? Colors.error : 'black' }}>
               {item.current_stock}
             </Text>
             {isLow && (
               <Chip 
                 icon="alert-circle" 
                 style={{ marginLeft: 8, backgroundColor: '#ffebee' }} 
                 textStyle={{ color: Colors.error, fontSize: 10 }}
                 compact
               >
                 Bajo
               </Chip>
             )}
          </View>
        );
      }
    },
    {
      key: 'actions',
      label: 'Acciones',
      renderCell: (item) => (
        <Button 
          mode="text" 
          onPress={() => router.push(`/(dashboard)/inventory/${item.id}`)}
          compact
        >
          Kardex
        </Button>
      )
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>Inventario</Text>
          <View style={styles.headerActions}>
             <Menu
              visible={showWarehouseMenu}
              onDismiss={() => setShowWarehouseMenu(false)}
              anchor={
                <Button 
                  mode="outlined" 
                  onPress={() => setShowWarehouseMenu(true)} 
                  icon="warehouse"
                  style={{ marginRight: 8 }}
                >
                  {selectedWarehouse ? selectedWarehouse.name : 'Seleccionar Almacén'}
                </Button>
              }
            >
              {warehouses.map(w => (
                <Menu.Item 
                  key={w.id} 
                  onPress={() => {
                    setSelectedWarehouse(w);
                    setShowWarehouseMenu(false);
                  }} 
                  title={w.name} 
                />
              ))}
            </Menu>
            <Button mode="outlined" onPress={loadData} icon="refresh">Actualizar</Button>
          </View>
        </View>

        <Card style={styles.filtersCard}>
          <Card.Content style={styles.filtersContent}>
              <TextInput 
                  label="Buscar producto (Nombre/SKU)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  mode="outlined"
                  dense
                  right={<TextInput.Icon icon="magnify" />}
              />
              <View style={styles.filterChips}>
                  <Chip 
                      selected={showLowStock} 
                      onPress={() => setShowLowStock(!showLowStock)}
                      showSelectedOverlay
                      icon={showLowStock ? "check" : "alert-circle-outline"}
                      style={showLowStock ? { backgroundColor: '#ffebee' } : {}}
                      textStyle={showLowStock ? { color: Colors.error } : {}}
                  >
                      Solo Stock Bajo
                  </Chip>
              </View>
          </Card.Content>
        </Card>

        <Table
          data={products}
          columns={columns}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="No hay productos en inventario"
          loading={loading}
          itemsPerPage={10}
        />
      </ScrollableContent>
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
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  headerActions: {
      flexDirection: 'row',
  },
  filtersCard: {
      marginBottom: 16,
  },
  filtersContent: {
      flexDirection: 'column',
      gap: 12,
  },
  searchInput: {
      backgroundColor: 'white',
  },
  filterChips: {
      flexDirection: 'row',
      gap: 8,
  },
  card: {
    flex: 1,
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 20,
      color: 'gray',
  },
});
