import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, DataTable, FAB, Chip, useTheme, Searchbar, Button, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { maintenanceService } from '../../../../../../services/maintenanceService';
import { MaintenanceRecord, MaintenanceStatus } from '../../../../../../types/maintenance';
import { LoadingScreen } from '../../../../../../components/LoadingScreen';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function VehicleMaintenanceHistoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<MaintenanceStatus | null>(null);

  const vehicleId = parseInt(id as string);

  useEffect(() => {
    loadRecords();
  }, [id]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await maintenanceService.getHistory(vehicleId);
      setRecords(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.maintenance_type?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.provider_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus ? r.status === filterStatus : true;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.COMPLETED: return theme.colors.primary;
      case MaintenanceStatus.IN_PROGRESS: return theme.colors.tertiary;
      case MaintenanceStatus.SCHEDULED: return theme.colors.secondary;
      case MaintenanceStatus.CANCELLED: return theme.colors.error;
      default: return theme.colors.outline;
    }
  };

  if (loading && !records.length) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Historial de Mantenimiento' }} />
      
      <View style={styles.filterContainer}>
        <Searchbar
          placeholder="Buscar..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
          <Chip 
            selected={filterStatus === null} 
            onPress={() => setFilterStatus(null)}
            style={styles.chip}
          >
            Todos
          </Chip>
          {Object.values(MaintenanceStatus).map(status => (
            <Chip
              key={status}
              selected={filterStatus === status}
              onPress={() => setFilterStatus(status)}
              style={styles.chip}
            >
              {status}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRecords} />}
      >
        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{flex: 2}}>Servicio</DataTable.Title>
            <DataTable.Title>Fecha</DataTable.Title>
            <DataTable.Title>Estado</DataTable.Title>
            <DataTable.Title numeric>Costo</DataTable.Title>
            <DataTable.Title style={{maxWidth: 50}}></DataTable.Title>
          </DataTable.Header>

          {filteredRecords.map((record) => (
            <DataTable.Row key={record.id} onPress={() => router.push(`/(dashboard)/admin/vehicles/maintenance/${record.id}`)}>
              <DataTable.Cell style={{flex: 2}}>
                <View>
                  <Text variant="bodyMedium" style={{fontWeight: 'bold'}}>
                    {record.maintenance_type?.name || 'Mantenimiento'}
                  </Text>
                  <Text variant="bodySmall" style={{color: theme.colors.outline}}>
                    {record.odometer_at_service} km
                  </Text>
                </View>
              </DataTable.Cell>
              <DataTable.Cell>
                {format(new Date(record.service_date), 'dd/MM/yy')}
              </DataTable.Cell>
              <DataTable.Cell>
                <Text style={{color: getStatusColor(record.status), fontWeight: 'bold', fontSize: 12}}>
                  {record.status.toUpperCase()}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {record.cost_amount ? `$${record.cost_amount}` : '-'}
              </DataTable.Cell>
              <DataTable.Cell style={{maxWidth: 50}}>
                <IconButton icon="chevron-right" size={20} />
              </DataTable.Cell>
            </DataTable.Row>
          ))}

          {filteredRecords.length === 0 && (
            <View style={{padding: 20, alignItems: 'center'}}>
              <Text>No se encontraron registros.</Text>
            </View>
          )}
        </DataTable>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="white"
        label="Nuevo Mantenimiento"
        onPress={() => router.push(`/(dashboard)/admin/vehicles/${vehicleId}/maintenance/new`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    marginBottom: 10,
    backgroundColor: 'white',
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    marginRight: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
