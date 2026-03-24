import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Text, Chip, IconButton, Card, Button, TextInput, useTheme, ActivityIndicator, DataTable } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

import { LoadingScreen } from '../../../../components/LoadingScreen';
import { getPendingMovementRequests, MovementRequest, MovementType, MovementStatus } from '../../../../services/movementService';

export default function PendingRequestsScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const [requests, setRequests] = useState<MovementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<MovementType | undefined>(undefined);

  const loadRequests = async () => {
    try {
      const params: any = {};
      if (filterType) params.type = filterType;

      const data = await getPendingMovementRequests(params);
      setRequests(data);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error cargando solicitudes pendientes' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [filterType])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTypeColor = (type: MovementType) => {
    switch (type) {
      case MovementType.IN: return '#4caf50';
      case MovementType.OUT: return '#f44336';
      case MovementType.TRANSFER: return '#2196f3';
      case MovementType.ADJUSTMENT: return '#ff9800';
      default: return theme.colors.primary;
    }
  };

  const getTypeLabel = (type: MovementType) => {
    switch (type) {
      case MovementType.IN: return 'Entrada';
      case MovementType.OUT: return 'Salida';
      case MovementType.TRANSFER: return 'Transferencia';
      case MovementType.ADJUSTMENT: return 'Ajuste';
      default: return type;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            Solicitudes Pendientes
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <Button 
              mode={showFilters ? "contained" : "outlined"} 
              onPress={() => setShowFilters(!showFilters)} 
              icon="filter"
              style={{ marginRight: 8 }}
              compact
            >
              Filtros
            </Button>
            <Button mode="outlined" onPress={loadRequests} icon="refresh" compact>
              Actualizar
            </Button>
          </View>
        </View>

        {showFilters && (
          <Card style={[styles.filtersCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleSmall" style={{ marginBottom: 12, color: theme.colors.onSurface }}>
                Filtrar por Tipo
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chip 
                  selected={filterType === undefined} 
                  onPress={() => setFilterType(undefined)}
                  style={styles.filterChip}
                  selectedColor={theme.colors.primary}
                  showSelectedOverlay
                >
                  Todos
                </Chip>
                {Object.values(MovementType).map(type => (
                  <Chip 
                    key={type} 
                    selected={filterType === type} 
                    onPress={() => setFilterType(type)}
                    style={styles.filterChip}
                    selectedColor={getTypeColor(type)}
                    showSelectedOverlay
                  >
                    {getTypeLabel(type)}
                  </Chip>
                ))}
              </ScrollView>
            </Card.Content>
          </Card>
        )}

        {loading && requests.length === 0 ? (
          <LoadingScreen />
        ) : requests.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.emptyContent}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                No hay solicitudes pendientes
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                Las solicitudes aparecerán aquí cuando existan movimientos pendientes por revisar
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <Card style={[styles.tableCard, { backgroundColor: theme.colors.surface }]}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title numeric style={styles.colId}>ID</DataTable.Title>
                <DataTable.Title style={styles.colType}>Tipo</DataTable.Title>
                <DataTable.Title style={styles.colReason}>Motivo</DataTable.Title>
                <DataTable.Title style={styles.colDate}>Fecha</DataTable.Title>
                <DataTable.Title style={styles.colActions}>Acciones</DataTable.Title>
              </DataTable.Header>

              {requests.map((item) => (
                <DataTable.Row 
                  key={item.id}
                  onPress={() => router.push(`/(dashboard)/moderator/requests/${item.id}`)}
                >
                  <DataTable.Cell style={styles.colId}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>#{item.id}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colType}>
                    <Chip 
                      textStyle={{ color: 'white', fontSize: 10 }} 
                      style={{ backgroundColor: getTypeColor(item.type), height: 24 }}
                      compact
                    >
                      {getTypeLabel(item.type)}
                    </Chip>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colReason}>
                    <Text variant="bodySmall" numberOfLines={2} style={{ color: theme.colors.onSurface }}>
                      {item.reason || '-'}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colDate}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatDate(item.created_at)}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colActions}>
                    <Button 
                      mode="text" 
                      compact
                      onPress={() => router.push(`/(dashboard)/moderator/requests/${item.id}`)}
                    >
                      Revisar
                    </Button>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    flex: 1,
  },
  filtersCard: {
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  emptyCard: {
    marginTop: 32,
  },
  emptyContent: {
    padding: 32,
    alignItems: 'center',
  },
  tableCard: {
    marginBottom: 16,
  },
  colId: {
    width: 50,
  },
  colType: {
    width: 100,
  },
  colReason: {
    flex: 2,
  },
  colDate: {
    width: 100,
  },
  colActions: {
    width: 80,
  },
});
