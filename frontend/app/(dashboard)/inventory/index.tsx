
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, Menu, Portal, Modal, ActivityIndicator, IconButton, FAB, TextInput, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

import { ScreenContainer } from '../../../components/ScreenContainer';
import { Table, Column } from '../../../components/Table';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { LoadingScreen } from '../../../components/LoadingScreen';
import { warehouseService, WarehouseStockItem } from '../../../services/warehouseService';
import { getProducts, Product } from '../../../services/productService';
import { locationService } from '../../../services/locationService';
import { LocationSelectionDialog } from '../../../components/locations/LocationSelectionDialog';
import { Layout } from '../../../constants/Layout';

interface InventoryItem extends Product {
  current_stock: number;
}

export default function InventoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [showWarehouseMenu, setShowWarehouseMenu] = useState(false);
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

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
      const stockData = await warehouseService.getWarehouseStock(selectedWarehouse.id);
      const stockMapObj: Record<number, number> = {};
      stockData.forEach(item => {
        stockMapObj[item.product_id] = item.quantity;
      });
      setStockMap(stockMapObj);

      const productsData = await getProducts({ limit: 100, search: searchQuery });
      
      const inventoryItems: InventoryItem[] = productsData.map((p: Product) => ({
        ...p,
        current_stock: stockMapObj[p.id] || 0
      }));

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

  const renderInventoryCard = (item: InventoryItem) => {
    const isLow = item.current_stock < (item.min_stock || 0);
    return (
      <Card
        title={item.name}
        subtitle={item.sku}
        footer={
            <View style={styles.cardActions}>
              <IconButton 
                icon="file-document-outline" 
                size={20}
                onPress={() => router.push(`/(dashboard)/inventory/${item.id}`)}
              />
              <IconButton 
                icon="map-marker-plus" 
                size={20} 
                iconColor={theme.colors.primary}
                onPress={() => router.push(`/(dashboard)/operator/products/${item.id}/assign-location`)}
              />
            </View>
        }
      >
        <View style={styles.cardContent}>
            <View style={styles.stockRow}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Stock: </Text>
                <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: isLow ? theme.colors.error : theme.colors.onSurface }}>
                {item.current_stock}
                </Text>
                {isLow && (
                <Chip 
                    icon="alert-circle" 
                    style={{ marginLeft: 8, backgroundColor: theme.colors.errorContainer }} 
                    textStyle={{ color: theme.colors.onErrorContainer, fontSize: 10 }}
                    compact
                >
                    Bajo
                </Chip>
                )}
            </View>
        </View>
      </Card>
    );
  };

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      label: 'Producto',
      flex: 2,
      renderCell: (item) => (
        <View>
          <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{item.name}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.sku}</Text>
        </View>
      )
    },
    {
      key: 'current_stock',
      label: 'Stock',
      numeric: true,
      width: 150,
      renderCell: (item) => {
        const isLow = item.current_stock < (item.min_stock || 0);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
             <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: isLow ? theme.colors.error : theme.colors.onSurface }}>
               {item.current_stock}
             </Text>
             {isLow && (
               <Chip 
                 icon="alert-circle" 
                 style={{ marginLeft: 8, backgroundColor: theme.colors.errorContainer }} 
                 textStyle={{ color: theme.colors.onErrorContainer, fontSize: 10 }}
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
      width: 140,
      renderCell: (item) => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton 
            icon="file-document-outline" 
            size={20}
            onPress={() => router.push(`/(dashboard)/inventory/${item.id}`)}
          />
          <IconButton 
            icon="map-marker-plus" 
            size={20} 
            iconColor={theme.colors.primary}
            onPress={() => router.push(`/(dashboard)/operator/products/${item.id}/assign-location`)}
          />
        </View>
      )
    }
  ];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>Inventario</Text>
        <View style={styles.headerActions}>
            <Menu
            visible={showWarehouseMenu}
            onDismiss={() => setShowWarehouseMenu(false)}
            anchor={
              <Button 
                variant="outline"
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
          <Button variant="outline" onPress={loadData} icon="refresh">Actualizar</Button>
        </View>
      </View>

      <View style={{ marginBottom: Layout.spacing.md, alignItems: 'flex-end' }}>
          {selectedWarehouse && (
            <Button 
              variant="outline"
              icon="map"
              onPress={() => router.push(`/(dashboard)/moderator/warehouses/${selectedWarehouse.id}/map`)}
            >
              Ver Ubicaciones
            </Button>
          )}
      </View>

      <Card style={styles.filtersCard}>
        <View style={styles.filtersContent}>
            <Input 
                label="Buscar producto (Nombre/SKU)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                containerStyle={[styles.searchInput, { backgroundColor: theme.colors.surface }]}
                right={<TextInput.Icon icon="magnify" />}
            />
            <View style={styles.filterChips}>
                <Button 
                  variant={selectedLocation ? "primary" : "outline"}
                  onPress={() => setShowLocationDialog(true)}
                  style={{ marginRight: 8 }}
                  icon="map-marker"
                  >
                  {selectedLocation ? `${selectedLocation.code}` : 'Filtrar Ubicación'}
                </Button>
                {selectedLocation && (
                  <IconButton icon="close" size={20} onPress={() => setSelectedLocation(null)} />
                )}

                <Chip 
                    selected={showLowStock} 
                    onPress={() => setShowLowStock(!showLowStock)}
                    showSelectedOverlay
                    icon={showLowStock ? "check" : "alert-circle-outline"}
                    style={showLowStock ? { backgroundColor: theme.colors.errorContainer } : {}}
                    textStyle={showLowStock ? { color: theme.colors.onErrorContainer } : {}}
                >
                    Solo Stock Bajo
                </Chip>
            </View>
        </View>
      </Card>

      <Table
        data={products}
        columns={columns}
        keyExtractor={(item) => item.id.toString()}
        emptyMessage="No hay productos en inventario"
        loading={loading}
        itemsPerPage={10}
        renderCard={renderInventoryCard}
      />

      <Portal>
        <FAB
          icon="plus"
          label="Nuevo Movimiento"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => router.push('/(dashboard)/inventory/movements/create')}
        />
      </Portal>

      <LocationSelectionDialog
        visible={showLocationDialog}
        onDismiss={() => setShowLocationDialog(false)}
        onSelect={(loc) => {
            setSelectedLocation(loc);
            setShowLocationDialog(false);
        }}
        warehouseId={selectedWarehouse?.id}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    margin: Layout.spacing.md,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  title: {
    fontWeight: 'bold',
  },
  headerActions: {
      flexDirection: 'row',
  },
  filtersCard: {
      marginBottom: Layout.spacing.md,
  },
  filtersContent: {
      flexDirection: 'column',
      gap: Layout.spacing.sm,
  },
  searchInput: {
      // Background handled dynamically
  },
  filterChips: {
      flexDirection: 'row',
      gap: Layout.spacing.sm,
      alignItems: 'center',
      flexWrap: 'wrap',
  },
  stockRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
  },
  cardContent: {
      gap: 4,
  },
});
