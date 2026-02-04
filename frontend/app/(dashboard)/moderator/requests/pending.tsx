import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Text, Button, Card, Chip, IconButton, TextInput, Menu, Portal, Modal } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

import { Table, Column } from '../../../../components/Table';
import { LoadingScreen } from '../../../../components/LoadingScreen';
import { getPendingMovementRequests, MovementRequest, MovementType } from '../../../../services/movementService';
import { Colors } from '../../../../constants/Colors';

export default function PendingRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<MovementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<MovementType | undefined>(undefined);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterDate, setFilterDate] = useState(''); // Simple date filter

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.type = filterType;
      if (filterWarehouse) params.warehouse_id = Number(filterWarehouse);
      if (filterDate) {
          // Assuming backend supports start_date/end_date, we'll just use it as start for now or both if user provides range
          // For simplicity, let's just pass start_date as the filter date
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
    }, [filterType, filterWarehouse, filterDate]) // Reload when filters change
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

  const columns: Column<MovementRequest>[] = [
    {
      key: 'id',
      label: 'ID',
      numeric: true,
    },
    {
      key: 'type',
      label: 'Tipo',
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
    },
    {
      key: 'created_at',
      label: 'Fecha',
      renderCell: (item) => <Text variant="bodySmall">{formatDate(item.created_at)}</Text>
    },
    {
      key: 'actions',
      label: 'Acciones',
      renderCell: (item) => (
        <Button 
          mode="text" 
          onPress={() => router.push(`/(dashboard)/moderator/requests/${item.id}`)}
          compact
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
                  mode={showFilters ? "contained" : "outlined"} 
                  onPress={() => setShowFilters(!showFilters)} 
                  icon="filter"
                  style={{ marginRight: 8 }}
              >
                  Filtros
              </Button>
              <Button mode="outlined" onPress={loadRequests} icon="refresh">Actualizar</Button>
          </View>
        </View>

        {showFilters && (
          <Card style={styles.filtersCard}>
              <Card.Content>
                  <Text variant="titleSmall" style={{ marginBottom: 8 }}>Filtrar por Tipo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      <Chip 
                          selected={filterType === undefined} 
                          onPress={() => setFilterType(undefined)}
                          style={styles.filterChip}
                      >
                          Todos
                      </Chip>
                      {Object.values(MovementType).map(type => (
                          <Chip 
                              key={type} 
                              selected={filterType === type} 
                              onPress={() => setFilterType(type)}
                              style={styles.filterChip}
                          >
                              {type}
                          </Chip>
                      ))}
                  </ScrollView>

                  <View style={styles.inputRow}>
                      <TextInput 
                          label="ID Almacén"
                          value={filterWarehouse}
                          onChangeText={setFilterWarehouse}
                          keyboardType="numeric"
                          style={[styles.input, { marginRight: 8 }]}
                          mode="outlined"
                          dense
                      />
                      <TextInput 
                          label="Fecha (YYYY-MM-DD)"
                          value={filterDate}
                          onChangeText={setFilterDate}
                          style={styles.input}
                          mode="outlined"
                          dense
                      />
                  </View>
                  
                  <Button mode="text" onPress={() => {
                      setFilterType(undefined);
                      setFilterWarehouse('');
                      setFilterDate('');
                  }}>Limpiar Filtros</Button>
              </Card.Content>
          </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
           {loading && requests.length === 0 ? (
               <LoadingScreen />
           ) : requests.length === 0 ? (
               <Text style={styles.emptyText}>No hay solicitudes pendientes que coincidan con los filtros.</Text>
           ) : (
               <Table
                columns={columns}
                data={requests}
                keyExtractor={(item) => String(item.id)}
               />
           )}
        </Card.Content>
      </Card>
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
  },
  title: {
    fontWeight: 'bold',
    color: '#1f2937',
    fontSize: 20,
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    flex: 1,
  },
  filtersCard: {
      backgroundColor: 'white',
      marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#6b7280',
  },
  filterChip: {
      marginRight: 8,
  },
  inputRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  input: {
      flex: 1,
      backgroundColor: 'white',
  }
});