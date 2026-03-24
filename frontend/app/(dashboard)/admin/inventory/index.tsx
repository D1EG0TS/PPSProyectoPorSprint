import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme, Chip, SegmentedButtons, IconButton, Searchbar, Card, DataTable } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Card as CustomCard } from '../../../../components/Card';
import { Layout } from '../../../../constants/Layout';
import { warehouseService, WarehouseStockItem } from '../../../../services/warehouseService';
import { getProducts, Product, getCategories } from '../../../../services/productService';

interface InventorySummary {
  totalProducts: number;
  totalValue: number;
  movementsToday: number;
  lowStockCount: number;
  criticalStockCount: number;
}

interface WarehouseStock {
  product_id: number;
  product?: Product;
  quantity: number;
  location_count: number;
}

export default function AdminInventoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [stockData, setStockData] = useState<WarehouseStock[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'critical'>('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0]);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadData = async () => {
    if (!selectedWarehouse) return;
    
    setLoading(true);
    try {
      const [stockRes, productsRes] = await Promise.all([
        warehouseService.getWarehouseStock(selectedWarehouse.id),
        getProducts({ limit: 200, search: searchQuery, category_id: selectedCategory || undefined })
      ]);

      const stockMap = new Map<number, number>();
      stockRes.forEach((item: WarehouseStockItem) => {
        stockMap.set(item.product_id, item.quantity);
      });

      const enrichedStock: WarehouseStock[] = productsRes
        .map((product: Product) => ({
          product_id: product.id,
          product,
          quantity: stockMap.get(product.id) || 0,
          location_count: 0
        }))
        .filter((item: WarehouseStock) => {
          if (filterMode === 'low') return item.quantity > 0 && item.quantity <= (item.product?.min_stock || 0);
          if (filterMode === 'critical') return item.quantity > 0 && item.quantity <= ((item.product?.min_stock || 0) * 0.5);
          return true;
        });

      setStockData(enrichedStock);

      const totalValue = enrichedStock.reduce((acc, item) => {
        return acc + (item.quantity * (item.product?.cost || 0));
      }, 0);

      const lowCount = enrichedStock.filter(item => 
        item.quantity > 0 && item.quantity <= (item.product?.min_stock || 0)
      ).length;

      const criticalCount = enrichedStock.filter(item => 
        item.quantity > 0 && item.quantity <= ((item.product?.min_stock || 0) * 0.5)
      ).length;

      setSummary({
        totalProducts: enrichedStock.length,
        totalValue,
        movementsToday: 0,
        lowStockCount: lowCount,
        criticalStockCount: criticalCount
      });
    } catch (error) {
      console.error('Error loading inventory:', error);
      Toast.show({ type: 'error', text1: 'Error cargando inventario' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    loadData();
  }, [selectedWarehouse, searchQuery, filterMode, selectedCategory]);

  useEffect(() => {
    loadCategories();
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      loadData();
    }
  }, [selectedWarehouse, searchQuery, filterMode, selectedCategory]);

  const filteredData = stockData.filter(item => {
    if (!item.product) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      item.product.name.toLowerCase().includes(searchLower) ||
      item.product.sku?.toLowerCase().includes(searchLower) ||
      item.product.barcode?.toLowerCase().includes(searchLower)
    );
  });

  const renderStockCard = (item: WarehouseStock) => {
    if (!item.product) return null;
    const isLow = item.quantity <= (item.product.min_stock || 0);
    const isCritical = item.quantity <= ((item.product.min_stock || 0) * 0.5);
    
    return (
      <CustomCard
        key={item.product_id}
        title={item.product.name}
        subtitle={`SKU: ${item.product.sku}`}
        style={styles.productCard}
      >
        <View style={styles.cardContent}>
          <View style={styles.stockInfo}>
            <View style={styles.stockRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Stock:</Text>
              <Text 
                variant="titleMedium" 
                style={{ 
                  fontWeight: 'bold',
                  color: isCritical ? theme.colors.error : isLow ? '#ff9800' : theme.colors.primary 
                }}
              >
                {item.quantity}
              </Text>
            </View>
            <View style={styles.stockRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Mín:</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {item.product.min_stock || 0}
              </Text>
            </View>
            {isLow && (
              <Chip 
                icon={isCritical ? "alert" : "alert-circle"} 
                style={{ 
                  backgroundColor: isCritical ? theme.colors.errorContainer : '#fff3e0',
                  alignSelf: 'flex-start',
                  marginTop: 8
                }}
                textStyle={{ color: isCritical ? theme.colors.onErrorContainer : '#e65100', fontSize: 11 }}
              >
                {isCritical ? 'Crítico' : 'Bajo'}
              </Chip>
            )}
          </View>
          <View style={styles.cardActions}>
            <IconButton icon="eye" size={20} onPress={() => router.push(`/admin/products/${item.product_id}`)} />
            <IconButton icon="map-marker" size={20} onPress={() => router.push(`/operator/products/${item.product_id}/assign-location`)} />
          </View>
        </View>
      </CustomCard>
    );
  };

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Gestión de Inventario
        </Text>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(v) => setViewMode(v as 'table' | 'cards')}
          buttons={[
            { value: 'table', icon: 'table', label: 'Tabla' },
            { value: 'cards', icon: 'view-grid', label: 'Tarjetas' },
          ]}
          style={styles.viewModeToggle}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        <Chip 
          selected={!selectedWarehouse}
          onPress={() => setSelectedWarehouse(null)}
          style={styles.filterChip}
          icon="warehouse"
        >
          Todos
        </Chip>
        {warehouses.map(w => (
          <Chip 
            key={w.id}
            selected={selectedWarehouse?.id === w.id}
            onPress={() => setSelectedWarehouse(w)}
            style={styles.filterChip}
            icon="warehouse"
          >
            {w.name}
          </Chip>
        ))}
      </ScrollView>

      <View style={styles.kpiContainer}>
        <Card style={[styles.kpiCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>Productos</Text>
            <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
              {summary?.totalProducts || 0}
            </Text>
          </Card.Content>
        </Card>
        <Card style={[styles.kpiCard, { backgroundColor: theme.colors.secondaryContainer }]}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: theme.colors.onSecondaryContainer }}>Valor</Text>
            <Text variant="titleLarge" style={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }}>
              ${(summary?.totalValue || 0).toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
        <Card style={[styles.kpiCard, { backgroundColor: '#fff3e0' }]}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: '#e65100' }}>Stock Bajo</Text>
            <Text variant="titleLarge" style={{ color: '#e65100', fontWeight: 'bold' }}>
              {summary?.lowStockCount || 0}
            </Text>
          </Card.Content>
        </Card>
        <Card style={[styles.kpiCard, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer }}>Crítico</Text>
            <Text variant="titleLarge" style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold' }}>
              {summary?.criticalStockCount || 0}
            </Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar por nombre, SKU o código..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
        />
      </View>

      <View style={styles.filterActions}>
        <SegmentedButtons
          value={filterMode}
          onValueChange={(v) => setFilterMode(v as 'all' | 'low' | 'critical')}
          buttons={[
            { value: 'all', label: `Todos` },
            { value: 'low', label: `Bajos` },
            { value: 'critical', label: `Críticos` },
          ]}
          style={styles.filterToggle}
        />
      </View>

      {viewMode === 'table' ? (
        <Card style={styles.tableCard}>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Producto</DataTable.Title>
              <DataTable.Title numeric>Stock</DataTable.Title>
              <DataTable.Title numeric>Mín.</DataTable.Title>
              <DataTable.Title numeric>Valor</DataTable.Title>
              <DataTable.Title>Estado</DataTable.Title>
            </DataTable.Header>

            {filteredData.slice(0, 30).map((item) => {
              if (!item.product) return null;
              const isLow = item.quantity <= (item.product.min_stock || 0);
              const isCritical = item.quantity <= ((item.product.min_stock || 0) * 0.5);
              
              return (
                <DataTable.Row key={item.product_id} onPress={() => router.push(`/admin/products/${item.product_id}`)}>
                  <DataTable.Cell>
                    <View>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.product.name}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.product.sku}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text 
                      style={{ 
                        fontWeight: 'bold',
                        color: isCritical ? theme.colors.error : isLow ? '#ff9800' : theme.colors.onSurface 
                      }}
                    >
                      {item.quantity}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>{item.product.min_stock || 0}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    ${((item.quantity || 0) * (item.product.cost || 0)).toFixed(2)}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {isCritical ? (
                      <Chip compact style={{ backgroundColor: theme.colors.errorContainer }} textStyle={{ fontSize: 10 }}>Crítico</Chip>
                    ) : isLow ? (
                      <Chip compact style={{ backgroundColor: '#fff3e0' }} textStyle={{ fontSize: 10, color: '#e65100' }}>Bajo</Chip>
                    ) : (
                      <Chip compact style={{ backgroundColor: '#e8f5e9' }} textStyle={{ fontSize: 10, color: '#2e7d32' }}>OK</Chip>
                    )}
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}

            <DataTable.Pagination
              page={0}
              numberOfPages={Math.ceil(filteredData.length / 30)}
              onPageChange={() => {}}
              label={`${filteredData.length} productos`}
            />
          </DataTable>
        </Card>
      ) : (
        <View style={styles.cardsContainer}>
          {filteredData.map(renderStockCard)}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  viewModeToggle: {
    maxWidth: 200,
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.md,
  },
  filterChip: {
    marginRight: 8,
  },
  kpiContainer: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: 80,
  },
  searchContainer: {
    marginBottom: Layout.spacing.md,
  },
  searchBar: {
    elevation: 0,
  },
  filterActions: {
    marginBottom: Layout.spacing.md,
  },
  filterToggle: {
    maxWidth: 300,
  },
  tableCard: {
    marginBottom: Layout.spacing.md,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.md,
  },
  productCard: {
    width: '48%',
    minWidth: 250,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stockInfo: {
    flex: 1,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
  },
});
