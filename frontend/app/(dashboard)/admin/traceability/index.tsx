import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme, Chip, Card, DataTable, Searchbar, IconButton, SegmentedButtons, Divider, List } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Card as CustomCard } from '../../../../components/Card';
import { Layout } from '../../../../constants/Layout';
import { getProducts, Product } from '../../../../services/productService';
import { warehouseService } from '../../../../services/warehouseService';
import api from '../../../../services/api';

interface TraceabilityRecord {
  id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  movement_type: string;
  quantity: number;
  reference?: string;
  warehouse_from?: string;
  warehouse_to?: string;
  location_from?: string;
  location_to?: string;
  user_name?: string;
  created_at: string;
  notes?: string;
}

interface StockHistoryEntry {
  id: number;
  product_id: number;
  warehouse_id: number;
  location_id?: number;
  quantity: number;
  movement_type: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by?: number;
}

export default function TraceabilityScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [traceabilityRecords, setTraceabilityRecords] = useState<StockHistoryEntry[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    totalAdjustments: 0,
    lastMovement: null as StockHistoryEntry | null
  });

  const loadProducts = async (query?: string) => {
    try {
      const data = await getProducts({ limit: 100, search: query });
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadTraceability = async (productId: number) => {
    setLoading(true);
    try {
      const response = await api.get<StockHistoryEntry[]>(`/stock/history/${productId}`);
      const records = response.data || [];
      setTraceabilityRecords(records);

      let totalIn = 0;
      let totalOut = 0;
      let totalAdjustments = 0;

      records.forEach(r => {
        if (r.movement_type === 'IN') totalIn += r.quantity;
        else if (r.movement_type === 'OUT') totalOut += r.quantity;
        else totalAdjustments += Math.abs(r.quantity);
      });

      setStats({
        totalIn,
        totalOut,
        totalAdjustments,
        lastMovement: records.length > 0 ? records[0] : null
      });
    } catch (error) {
      console.error('Error loading traceability:', error);
      Toast.show({ type: 'error', text1: 'Error cargando trazabilidad' });
      setTraceabilityRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadTraceability(selectedProduct.id);
    }
  }, [selectedProduct]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadProducts(query);
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN': return 'arrow-down-bold';
      case 'OUT': return 'arrow-up-bold';
      case 'TRANSFER': return 'swap-horizontal-bold';
      case 'ADJUSTMENT': return 'pencil';
      default: return 'circle';
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'IN': return '#4caf50';
      case 'OUT': return '#f44336';
      case 'TRANSFER': return '#2196f3';
      case 'ADJUSTMENT': return '#ff9800';
      default: return theme.colors.onSurface;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={loading} onRefresh={() => selectedProduct && loadTraceability(selectedProduct.id)} />}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Trazabilidad de Inventario
        </Text>
      </View>

      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Buscar producto por nombre o SKU..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
        />
        
        {searchQuery.length > 0 && (
          <Card style={styles.searchResults}>
            <ScrollView style={styles.resultsList}>
              {filteredProducts.slice(0, 5).map(product => (
                <List.Item
                  key={product.id}
                  title={product.name}
                  description={`SKU: ${product.sku}`}
                  onPress={() => {
                    setSelectedProduct(product);
                    setSearchQuery('');
                  }}
                  left={props => <List.Icon {...props} icon="package-variant" />}
                  right={props => <Chip compact>{product.id}</Chip>}
                />
              ))}
              {filteredProducts.length === 0 && (
                <Text style={{ padding: 16, color: theme.colors.onSurfaceVariant }}>No se encontraron productos</Text>
              )}
            </ScrollView>
          </Card>
        )}
      </View>

      {selectedProduct && (
        <>
          <CustomCard title={selectedProduct.name} subtitle={`SKU: ${selectedProduct.sku}`}>
            <View style={styles.productStats}>
              <View style={styles.statItem}>
                <Chip icon="arrow-down-bold" style={{ backgroundColor: '#e8f5e9' }} textStyle={{ color: '#2e7d32' }}>
                  Entradas: {stats.totalIn}
                </Chip>
              </View>
              <View style={styles.statItem}>
                <Chip icon="arrow-up-bold" style={{ backgroundColor: '#ffebee' }} textStyle={{ color: '#c62828' }}>
                  Salidas: {stats.totalOut}
                </Chip>
              </View>
              <View style={styles.statItem}>
                <Chip icon="pencil" style={{ backgroundColor: '#fff3e0' }} textStyle={{ color: '#e65100' }}>
                  Ajustes: {stats.totalAdjustments}
                </Chip>
              </View>
            </View>
            <Divider style={{ marginVertical: 12 }} />
            <View style={styles.actionRow}>
              <IconButton icon="eye" onPress={() => router.push(`/admin/products/${selectedProduct.id}`)} />
              <IconButton icon="chart-line" onPress={() => {}} />
              <IconButton icon="file-document" onPress={() => {}} />
            </View>
          </CustomCard>

          <View style={styles.viewToggle}>
            <SegmentedButtons
              value={viewMode}
              onValueChange={(v) => setViewMode(v as 'list' | 'timeline')}
              buttons={[
                { value: 'list', icon: 'format-list-bulleted', label: 'Lista' },
                { value: 'timeline', icon: 'timeline', label: 'Línea de Tiempo' },
              ]}
            />
          </View>

          {viewMode === 'list' ? (
            <Card style={styles.tableCard}>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Fecha</DataTable.Title>
                  <DataTable.Title>Tipo</DataTable.Title>
                  <DataTable.Title numeric>Cantidad</DataTable.Title>
                  <DataTable.Title>Referencia</DataTable.Title>
                </DataTable.Header>

                {traceabilityRecords.length === 0 ? (
                  <DataTable.Row>
                    <DataTable.Cell>
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>No hay movimientos registrados</Text>
                    </DataTable.Cell>
                  </DataTable.Row>
                ) : (
                  traceabilityRecords.slice(0, 50).map((record) => (
                    <DataTable.Row key={record.id}>
                      <DataTable.Cell>
                        <Text variant="bodySmall">{formatDate(record.created_at)}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Chip 
                          compact
                          style={{ backgroundColor: `${getMovementColor(record.movement_type)}20` }}
                          textStyle={{ color: getMovementColor(record.movement_type), fontSize: 10 }}
                        >
                          {record.movement_type}
                        </Chip>
                      </DataTable.Cell>
                      <DataTable.Cell numeric>
                        <Text style={{ 
                          fontWeight: 'bold',
                          color: getMovementColor(record.movement_type)
                        }}>
                          {record.movement_type === 'OUT' ? '-' : '+'}{record.quantity}
                        </Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Text variant="bodySmall" numberOfLines={1}>
                          {record.reference_number || '-'}
                        </Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))
                )}

                <DataTable.Pagination
                  page={0}
                  numberOfPages={Math.ceil(traceabilityRecords.length / 50)}
                  onPageChange={() => {}}
                  label={`${traceabilityRecords.length} registros`}
                />
              </DataTable>
            </Card>
          ) : (
            <View style={styles.timeline}>
              {traceabilityRecords.length === 0 ? (
                <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', padding: 32 }}>
                  No hay movimientos registrados
                </Text>
              ) : (
                traceabilityRecords.slice(0, 30).map((record, index) => (
                  <View key={record.id} style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: getMovementColor(record.movement_type) }]} />
                    {index < traceabilityRecords.length - 1 && <View style={styles.timelineLine} />}
                    <Card style={styles.timelineCard}>
                      <Card.Content style={styles.timelineContent}>
                        <View style={styles.timelineHeader}>
                          <Chip 
                            compact
                            style={{ backgroundColor: `${getMovementColor(record.movement_type)}20` }}
                            textStyle={{ color: getMovementColor(record.movement_type) }}
                          >
                            {record.movement_type}
                          </Chip>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {formatDate(record.created_at)}
                          </Text>
                        </View>
                        <View style={styles.timelineDetails}>
                          <Text variant="titleMedium" style={{ 
                            color: getMovementColor(record.movement_type),
                            fontWeight: 'bold'
                          }}>
                            {record.movement_type === 'OUT' ? '-' : '+'}{record.quantity} unidades
                          </Text>
                          {record.reference_number && (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              Ref: {record.reference_number}
                            </Text>
                          )}
                          {record.notes && (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              Nota: {record.notes}
                            </Text>
                          )}
                        </View>
                      </Card.Content>
                    </Card>
                  </View>
                ))
              )}
            </View>
          )}
        </>
      )}

      {!selectedProduct && (
        <View style={styles.emptyState}>
          <IconButton icon="magnify" size={64} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Busca un producto para ver su trazabilidad
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
            Ingresa el nombre o SKU del producto que deseas rastrear
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontWeight: 'bold',
  },
  searchSection: {
    marginBottom: Layout.spacing.md,
    zIndex: 10,
  },
  searchBar: {
    elevation: 0,
  },
  searchResults: {
    marginTop: 4,
    maxHeight: 250,
  },
  resultsList: {
    maxHeight: 250,
  },
  productStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    marginRight: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewToggle: {
    marginBottom: Layout.spacing.md,
  },
  tableCard: {
    marginBottom: Layout.spacing.md,
  },
  timeline: {
    paddingLeft: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
    position: 'relative',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    left: -24,
    top: 16,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    backgroundColor: '#e0e0e0',
    position: 'absolute',
    left: -17,
    top: 32,
    bottom: -8,
  },
  timelineCard: {
    flex: 1,
    marginLeft: 16,
  },
  timelineContent: {
    paddingVertical: 8,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineDetails: {
    gap: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
});
