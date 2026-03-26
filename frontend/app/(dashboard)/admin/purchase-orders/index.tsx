import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { DataTable, Searchbar, FAB, Portal, Dialog, Button, Text, Chip, Card, Divider, SegmentedButtons } from 'react-native-paper';
import { purchaseOrderService, PurchaseOrder, PurchaseOrderStatus, PurchaseOrderItem } from '../../../../services/purchaseOrderService';

const statusColors: Record<PurchaseOrderStatus, string> = {
  draft: '#9E9E9E',
  pending_approval: '#FF9800',
  approved: '#4CAF50',
  sent: '#2196F3',
  confirmed: '#03A9F4',
  in_progress: '#00BCD4',
  partially_received: '#009688',
  received: '#4CAF50',
  cancelled: '#F44336',
  rejected: '#E91E63',
};

const statusLabels: Record<PurchaseOrderStatus, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente',
  approved: 'Aprobado',
  sent: 'Enviado',
  confirmed: 'Confirmado',
  in_progress: 'En Progreso',
  partially_received: 'Parcial',
  received: 'Recibido',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
};

const priorityLabels: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function PurchaseOrdersScreen() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const itemsPerPage = 10;
  const numberOfPages = Math.ceil(total / itemsPerPage);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        skip: page * itemsPerPage,
        limit: itemsPerPage,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await purchaseOrderService.list(params);
      setOrders(response.orders);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const onSearch = () => {
    setPage(0);
    loadOrders();
  };

  const showDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDetailVisible(true);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)} MXN`;
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Buscar orden..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        onSubmitEditing={onSearch}
        style={styles.searchbar}
      />

      <SegmentedButtons
        value={statusFilter}
        onValueChange={(value) => {
          setStatusFilter(value);
          setPage(0);
        }}
        buttons={[
          { value: 'all', label: 'Todas' },
          { value: 'pending_approval', label: 'Pendientes' },
          { value: 'approved', label: 'Aprobadas' },
          { value: 'received', label: 'Recibidas' },
        ]}
        style={styles.segmented}
      />

      <ScrollView horizontal>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Orden</DataTable.Title>
            <DataTable.Title>Fecha</DataTable.Title>
            <DataTable.Title>Total</DataTable.Title>
            <DataTable.Title>Prioridad</DataTable.Title>
            <DataTable.Title>Estado</DataTable.Title>
          </DataTable.Header>

          {orders.map((order) => (
            <DataTable.Row key={order.id} onPress={() => showDetail(order)}>
              <DataTable.Cell>{order.order_number}</DataTable.Cell>
              <DataTable.Cell>
                {order.created_at ? new Date(order.created_at * 1000).toLocaleDateString() : '-'}
              </DataTable.Cell>
              <DataTable.Cell>{formatCurrency(order.total_amount)}</DataTable.Cell>
              <DataTable.Cell>{priorityLabels[order.priority]}</DataTable.Cell>
              <DataTable.Cell>
                <Chip
                  style={{ backgroundColor: statusColors[order.status] }}
                  textStyle={{ color: '#fff', fontSize: 10 }}
                >
                  {statusLabels[order.status]}
                </Chip>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </ScrollView>

      <DataTable.Pagination
        page={page}
        numberOfPages={numberOfPages}
        onPageChange={setPage}
        label={`${page + 1} de ${numberOfPages}`}
        showFastPaginationControls
        numberOfItemsPerPage={itemsPerPage}
      />

      <Portal>
        <Dialog visible={detailVisible} onDismiss={() => setDetailVisible(false)}>
          <Dialog.Title>Detalle de Orden de Compra</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              {selectedOrder && (
                <>
                  <Card style={styles.detailCard}>
                    <Card.Title title={selectedOrder.order_number} />
                    <Card.Content>
                      <View style={styles.row}>
                        <View style={styles.column}>
                          <Text style={styles.label}>Estado</Text>
                          <Chip
                            style={{ backgroundColor: statusColors[selectedOrder.status] }}
                            textStyle={{ color: '#fff' }}
                          >
                            {statusLabels[selectedOrder.status]}
                          </Chip>
                        </View>
                        <View style={styles.column}>
                          <Text style={styles.label}>Prioridad</Text>
                          <Text>{priorityLabels[selectedOrder.priority]}</Text>
                        </View>
                      </View>
                      <Divider style={styles.divider} />
                      <Text style={styles.subtitle}>Montos</Text>
                      <Text style={styles.label}>Subtotal: {formatCurrency(selectedOrder.subtotal)}</Text>
                      <Text style={styles.label}>IVA: {formatCurrency(selectedOrder.tax_amount)}</Text>
                      <Text style={styles.label}>Envío: {formatCurrency(selectedOrder.shipping_cost)}</Text>
                      <Text style={styles.totalLabel}>Total: {formatCurrency(selectedOrder.total_amount)}</Text>
                      <Divider style={styles.divider} />
                      <Text style={styles.subtitle}>Fechas</Text>
                      <Text style={styles.label}>
                        Creación: {selectedOrder.created_at ? new Date(selectedOrder.created_at * 1000).toLocaleDateString() : '-'}
                      </Text>
                      <Text style={styles.label}>
                        Entrega Esperada: {selectedOrder.expected_delivery_date || '-'}
                      </Text>
                      {selectedOrder.actual_delivery_date && (
                        <Text style={styles.label}>
                          Entrega Real: {selectedOrder.actual_delivery_date}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>

                  <Card style={styles.detailCard}>
                    <Card.Title title="Artículos" />
                    <Card.Content>
                      {selectedOrder.items.map((item: PurchaseOrderItem, index: number) => (
                        <View key={item.id || index} style={styles.itemRow}>
                          <Text style={styles.itemName}>{item.product_name}</Text>
                          <Text style={styles.itemQty}>x{item.quantity}</Text>
                          <Text style={styles.itemPrice}>{formatCurrency(item.total_price)}</Text>
                        </View>
                      ))}
                    </Card.Content>
                  </Card>

                  {selectedOrder.notes && (
                    <Card style={styles.detailCard}>
                      <Card.Title title="Notas" />
                      <Card.Content>
                        <Text>{selectedOrder.notes}</Text>
                      </Card.Content>
                    </Card>
                  )}
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDetailVisible(false)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => console.log('Create order')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchbar: {
    margin: 16,
  },
  segmented: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  dialogContent: {
    padding: 16,
  },
  detailCard: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    flex: 2,
  },
  itemQty: {
    flex: 1,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 1,
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976d2',
  },
});
