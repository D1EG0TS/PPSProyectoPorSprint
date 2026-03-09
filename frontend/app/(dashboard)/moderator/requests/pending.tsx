import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Text, Chip, IconButton } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

import { Table, Column } from '../../../../components/Table';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Input } from '../../../../components/Input';
import { LoadingScreen } from '../../../../components/LoadingScreen';
import { getPendingMovementRequests, MovementRequest, MovementType } from '../../../../services/movementService';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';

export default function PendingRequestsScreen() {
  const router = useRouter();
  // ... (state)
  const [requests, setRequests] = useState<MovementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<MovementType | undefined>(undefined);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // ... (loadRequests)

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (filterWarehouse) params.warehouse_id = Number(filterWarehouse);
      if (filterDate) {
          params.start_date = filterDate;
      }

      const data = await getPendingMovementRequests(params);
      setRequests(data);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error cargando solicitudes pendientes' });
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [filterType, filterWarehouse, filterDate])
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const getTypeColor = (type: MovementType) => {
    switch (type) {
      case MovementType.IN: return Colors.success;
      case MovementType.OUT: return Colors.error;
      case MovementType.TRANSFER: return Colors.info;
      case MovementType.ADJUSTMENT: return Colors.warning;
      default: return Colors.primary;
    }
  };

  const renderRequestCard = (item: MovementRequest) => (
    <Card
      title={`Solicitud #${item.id}`}
      subtitle={formatDate(item.created_at)}
      footer={
        <View style={styles.cardActions}>
          <Button 
            variant="primary" 
            onPress={() => router.push(`/(dashboard)/moderator/requests/${item.id}`)}
            size="small"
          >
            Revisar
          </Button>
        </View>
      }
    >
      <View style={styles.cardContent}>
        <View style={styles.row}>
            <Text style={styles.label}>Tipo:</Text>
            <Chip 
              textStyle={{ color: 'white', fontSize: 10 }} 
              style={{ backgroundColor: getTypeColor(item.type), height: 24 }}
            >
              {item.type}
            </Chip>
        </View>
        <View style={styles.row}>
            <Text style={styles.label}>Motivo:</Text>
            <Text style={{flex: 1}} numberOfLines={2}>{item.reason}</Text>
        </View>
      </View>
    </Card>
  );

  const columns: Column<MovementRequest>[] = [
    {
      key: 'id',
      label: 'ID',
      numeric: true,
      width: 60,
    },
    {
      key: 'type',
      label: 'Tipo',
      width: 100,
      renderCell: (item) => (
        <Chip 
          textStyle={{ color: 'white', fontSize: 10 }} 
          style={{ backgroundColor: getTypeColor(item.type), height: 24 }}
        >
          {item.type}
        </Chip>
      )
    },
    {
        key: 'reason',
        label: 'Motivo',
        flex: 2,
    },
    {
      key: 'created_at',
      label: 'Fecha',
      width: 150,
      renderCell: (item) => <Text variant="bodySmall">{formatDate(item.created_at)}</Text>
    },
    {
      key: 'actions',
      label: 'Acciones',
      width: 100,
      renderCell: (item) => (
        <Button 
          variant="primary" 
          onPress={() => router.push(`/(dashboard)/moderator/requests/${item.id}`)}
          size="small"
        >
          Revisar
        </Button>
      )
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>Solicitudes Pendientes</Text>
          <View style={{ flexDirection: 'row' }}>
              <Button 
                  variant={showFilters ? "primary" : "outline"} 
                  onPress={() => setShowFilters(!showFilters)} 
                  icon="filter"
                  style={{ marginRight: 8 }}
              >
                  Filtros
              </Button>
              <Button variant="outline" onPress={loadRequests} icon="refresh">Actualizar</Button>
          </View>
        </View>

        {showFilters && (
          <Card style={styles.filtersCard}>
              <View style={styles.filtersContent}>
                  <Text variant="titleSmall" style={{ marginBottom: 8 }}>Filtrar por Tipo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      <Chip 
                          selected={filterType === undefined} 
                          onPress={() => setFilterType(undefined)}
                          style={styles.filterChip}
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
                              showSelectedOverlay
                          >
                              {type}
                          </Chip>
                      ))}
                  </ScrollView>

                  <View style={styles.inputRow}>
                      <Input 
                          label="ID Almacén"
                          value={filterWarehouse}
                          onChangeText={setFilterWarehouse}
                          keyboardType="numeric"
                          containerStyle={[styles.inputContainer, { marginRight: 8 }]}
                          dense
                      />
                      <Input 
                          label="Fecha (YYYY-MM-DD)"
                          value={filterDate}
                          onChangeText={setFilterDate}
                          containerStyle={styles.inputContainer}
                          dense
                      />
                  </View>
                  
                  <Button variant="outline" onPress={() => {
                      setFilterType(undefined);
                      setFilterWarehouse('');
                      setFilterDate('');
                  }}>Limpiar Filtros</Button>
              </View>
          </Card>
      )}

      {loading && requests.length === 0 ? (
           <LoadingScreen />
       ) : (
           <Table
            columns={columns}
            data={requests}
            keyExtractor={(item) => String(item.id)}
            emptyMessage="No hay solicitudes pendientes que coincidan con los filtros."
            renderCard={renderRequestCard}
           />
       )}
      </ScrollableContent>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.spacing.md,
    backgroundColor: Colors.background,
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
    flex: 1,
  },
  filtersCard: {
      marginBottom: Layout.spacing.md,
  },
  filtersContent: {
      padding: 0,
  },
  filterChip: {
      marginRight: 8,
  },
  inputRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Layout.spacing.sm,
  },
  inputContainer: {
      flex: 1,
  },
  cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
  },
  cardContent: {
      gap: 4,
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
  },
  label: {
      fontWeight: 'bold',
      marginRight: 8,
      width: 60,
  }
});