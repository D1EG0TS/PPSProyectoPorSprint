import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme, Chip, Card, DataTable, Searchbar, IconButton, SegmentedButtons, FAB, Divider, Button, List } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Card as CustomCard } from '../../../../components/Card';
import { Layout } from '../../../../constants/Layout';
import { 
  getPendingMovementRequests, 
  getMyMovementRequests,
  MovementRequest,
  MovementType,
  MovementStatus 
} from '../../../../services/movementService';
import { warehouseService } from '../../../../services/warehouseService';

export default function MovementsScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'pending' | 'all' | 'history'>('pending');
  const [pendingRequests, setPendingRequests] = useState<MovementRequest[]>([]);
  const [myRequests, setMyRequests] = useState<MovementRequest[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<MovementRequest | null>(null);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pending, mine] = await Promise.all([
        getPendingMovementRequests({
          warehouse_id: selectedWarehouse?.id,
          limit: 50
        }),
        getMyMovementRequests({ limit: 50 })
      ]);
      setPendingRequests(pending);
      setMyRequests(mine);
    } catch (error) {
      console.error('Error loading movements:', error);
      Toast.show({ type: 'error', text1: 'Error cargando movimientos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedWarehouse, viewMode]);

  const getStatusColor = (status: MovementStatus) => {
    switch (status) {
      case MovementStatus.DRAFT: return '#9e9e9e';
      case MovementStatus.PENDING: return '#ff9800';
      case MovementStatus.APPROVED: return '#2196f3';
      case MovementStatus.REJECTED: return '#f44336';
      case MovementStatus.APPLIED: return '#4caf50';
      case MovementStatus.COMPLETED: return '#2e7d32';
      case MovementStatus.CANCELLED: return '#757575';
      default: return theme.colors.onSurface;
    }
  };

  const getTypeIcon = (type: MovementType) => {
    switch (type) {
      case MovementType.IN: return 'arrow-down-bold';
      case MovementType.OUT: return 'arrow-up-bold';
      case MovementType.TRANSFER: return 'swap-horizontal-bold';
      case MovementType.ADJUSTMENT: return 'pencil';
      default: return 'swap-horizontal';
    }
  };

  const getTypeColor = (type: MovementType) => {
    switch (type) {
      case MovementType.IN: return '#4caf50';
      case MovementType.OUT: return '#f44336';
      case MovementType.TRANSFER: return '#2196f3';
      case MovementType.ADJUSTMENT: return '#ff9800';
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

  const displayRequests = viewMode === 'pending' ? pendingRequests : 
                          viewMode === 'all' ? [...pendingRequests, ...myRequests] : 
                          myRequests;

  const filteredRequests = displayRequests.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.id.toString().includes(query) ||
      r.reference?.toLowerCase().includes(query) ||
      r.items.some(i => i.product?.name?.toLowerCase().includes(query))
    );
  });

  const requestStats = {
    pending: pendingRequests.length,
    today: myRequests.filter(r => {
      const today = new Date().toDateString();
      return new Date(r.created_at).toDateString() === today;
    }).length,
    totalItems: pendingRequests.reduce((acc, r) => acc + r.items.length, 0),
  };

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Movimientos de Inventario
        </Text>
        <Button 
          mode="contained" 
          icon="plus"
          onPress={() => router.push('/(dashboard)/inventory/movements/create')}
        >
          Nuevo Movimiento
        </Button>
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

      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineSmall" style={{ color: '#e65100', fontWeight: 'bold' }}>
              {requestStats.pending}
            </Text>
            <Text variant="labelSmall" style={{ color: '#e65100' }}>Pendientes</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineSmall" style={{ color: '#1565c0', fontWeight: 'bold' }}>
              {requestStats.today}
            </Text>
            <Text variant="labelSmall" style={{ color: '#1565c0' }}>Hoy</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
              {requestStats.totalItems}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>Ítems</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.viewToggle}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(v) => setViewMode(v as 'pending' | 'all' | 'history')}
          buttons={[
            { value: 'pending', label: 'Pendientes' },
            { value: 'all', label: 'Todos' },
            { value: 'history', label: 'Mis Solicitudes' },
          ]}
        />
      </View>

      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Buscar por ID o referencia..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
        />
      </View>

      <View style={styles.requestsList}>
        {filteredRequests.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <IconButton icon="swap-horizontal" size={48} />
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {viewMode === 'pending' ? 'No hay solicitudes pendientes' : 'No se encontraron solicitudes'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card 
              key={request.id} 
              style={styles.requestCard}
              onPress={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
            >
              <Card.Content>
                <View style={styles.requestHeader}>
                  <View style={styles.requestTitle}>
                    <Chip 
                      icon={getTypeIcon(request.type)}
                      style={{ backgroundColor: `${getTypeColor(request.type)}20` }}
                      textStyle={{ color: getTypeColor(request.type) }}
                    >
                      {request.type}
                    </Chip>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', marginLeft: 8 }}>
                      #{request.id}
                    </Text>
                  </View>
                  <Chip 
                    compact
                    style={{ backgroundColor: `${getStatusColor(request.status)}20` }}
                    textStyle={{ color: getStatusColor(request.status) }}
                  >
                    {request.status}
                  </Chip>
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.detailRow}>
                    <IconButton icon="clock-outline" size={16} style={{ margin: 0 }} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatDate(request.created_at)}
                    </Text>
                  </View>
                  {request.reference && (
                    <View style={styles.detailRow}>
                      <IconButton icon="file-document-outline" size={16} style={{ margin: 0 }} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Ref: {request.reference}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <IconButton icon="package-variant" size={16} style={{ margin: 0 }} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {request.items.length} ítem(s)
                    </Text>
                  </View>
                </View>

                {selectedRequest?.id === request.id && (
                  <View style={styles.expandedContent}>
                    <Divider style={{ marginVertical: 8 }} />
                    
                    {request.reason && (
                      <View style={styles.reasonSection}>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Motivo:
                        </Text>
                        <Text variant="bodyMedium">{request.reason}</Text>
                      </View>
                    )}

                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                      Ítems:
                    </Text>
                    {request.items.map((item, index) => (
                      <View key={item.id || index} style={styles.itemRow}>
                        <Text variant="bodyMedium">
                          {item.product?.name || `Producto #${item.product_id}`}
                        </Text>
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                          x{item.quantity}
                        </Text>
                      </View>
                    ))}

                    <View style={styles.actionButtons}>
                      <Button 
                        mode="outlined" 
                        onPress={() => router.push(`/moderator/requests/${request.id}`)}
                        icon="eye"
                      >
                        Ver Detalle
                      </Button>
                      {request.status === MovementStatus.PENDING && (
                        <Button 
                          mode="contained" 
                          onPress={() => router.push(`/moderator/requests/${request.id}`)}
                          icon="check"
                        >
                          Aprobar
                        </Button>
                      )}
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </View>

      <FAB.Group
        open={false}
        icon="plus"
        actions={[
          {
            icon: 'arrow-down-bold',
            label: 'Entrada',
            onPress: () => router.push('/(dashboard)/inventory/movements/create?type=IN'),
          },
          {
            icon: 'arrow-up-bold',
            label: 'Salida',
            onPress: () => router.push('/(dashboard)/inventory/movements/create?type=OUT'),
          },
          {
            icon: 'swap-horizontal-bold',
            label: 'Transferencia',
            onPress: () => router.push('/(dashboard)/inventory/movements/create?type=TRANSFER'),
          },
          {
            icon: 'pencil',
            label: 'Ajuste',
            onPress: () => router.push('/(dashboard)/inventory/movements/create?type=ADJUSTMENT'),
          },
        ]}
        onStateChange={() => {}}
        visible
        fabStyle={{ backgroundColor: theme.colors.primary }}
      />
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
  filtersRow: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.md,
  },
  filterChip: {
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 80,
  },
  statContent: {
    alignItems: 'center',
  },
  viewToggle: {
    marginBottom: Layout.spacing.md,
  },
  searchSection: {
    marginBottom: Layout.spacing.md,
  },
  searchBar: {
    elevation: 0,
  },
  requestsList: {
    gap: Layout.spacing.sm,
  },
  requestCard: {
    marginBottom: Layout.spacing.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedContent: {
    marginTop: 8,
  },
  reasonSection: {
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  emptyCard: {
    padding: 32,
  },
  emptyContent: {
    alignItems: 'center',
  },
});
