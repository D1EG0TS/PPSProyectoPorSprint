import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Divider, useTheme, Chip, List } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { maintenanceService } from '../../../../../../services/maintenanceService';
import { warehouseService, Warehouse } from '../../../../../../services/warehouseService';
import { MaintenanceRecord, MaintenanceStatus } from '../../../../../../types/maintenance';
import { LoadingScreen } from '../../../../../../components/LoadingScreen';
import { MaintenanceTimeline } from '../../../../../../components/maintenance/MaintenanceTimeline';
import { PartsTable } from '../../../../../../components/maintenance/PartsTable';
import { format } from 'date-fns';

export default function MaintenanceDetailScreen() {
  const { id, record_id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  
  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    loadRecord();
    loadWarehouses();
  }, [record_id]);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error("Failed to load warehouses", error);
    }
  };

  const loadRecord = async () => {
    try {
      setLoading(true);
      // We don't have a direct "getRecord" endpoint that takes ID only, 
      // but usually REST APIs support GET /records/{id}.
      // My service has getHistory(vehicleId). 
      // I should add getRecord(id) to service or find it in history.
      // Let's assume I need to add it or it exists.
      // Looking at service I created: getHistory only.
      // I will implement getRecord in service quickly or filter from history if needed (inefficient).
      // Best to add getRecord endpoint support in service.
      
      // Temporary workaround: Fetch history and find (not ideal but works for now if list is small)
      // OR use the backend endpoint: GET /vehicles/maintenance/{maintenance_id} if it exists.
      // Checking backend... endpoints/vehicle_maintenance.py has no GET single record by ID, only by vehicle.
      // Wait, let me check backend.
      
      // Backend check:
      // @router.get("/vehicles/{vehicle_id}/maintenance", response_model=List[MaintenanceRecordResponse])
      // No single record endpoint? That's an oversight in Sprint F.1 or I missed it.
      // Let's check backend/app/api/endpoints/vehicle_maintenance.py content if possible.
      // If not, I'll filter from history for now.
      
      const vehicleId = parseInt(id as string);
      const history = await maintenanceService.getHistory(vehicleId);
      const found = history.find(r => r.id === parseInt(record_id as string));
      setRecord(found || null);
      
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cargar el registro');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: MaintenanceStatus) => {
    if (!record) return;
    try {
      setActionLoading(true);
      await maintenanceService.updateStatus(record.id, newStatus);
      setRecord({ ...record, status: newStatus });
      Alert.alert('Éxito', `Estado actualizado a ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!record) return <View style={styles.center}><Text>Registro no encontrado</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Mantenimiento #${record.id}` }} />
      
      <ScrollView>
        <MaintenanceTimeline status={record.status} />

        <Card style={styles.card}>
          <Card.Title 
            title={record.maintenance_type?.name} 
            subtitle={format(new Date(record.service_date), 'dd/MM/yyyy')}
            right={(props) => <Chip style={{marginRight: 16}}>{record.maintenance_type?.category}</Chip>}
          />
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>Kilometraje:</Text>
              <Text>{record.odometer_at_service} km</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Proveedor:</Text>
              <Text>{record.provider_name || 'N/A'}</Text>
            </View>
             <View style={styles.row}>
              <Text style={styles.label}>Costo Total:</Text>
              <Text style={{fontWeight: 'bold', color: theme.colors.primary}}>
                ${record.cost_amount} {record.cost_currency}
              </Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.label}>Descripción:</Text>
            <Text style={styles.text}>{record.description || 'Sin descripción'}</Text>
            
            {record.notes && (
              <>
                <Text style={styles.label}>Notas:</Text>
                <Text style={styles.text}>{record.notes}</Text>
              </>
            )}
          </Card.Content>
        </Card>

        {record.parts && record.parts.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
               <PartsTable parts={record.parts} onChange={()=>{}} readOnly warehouses={warehouses} />
            </Card.Content>
          </Card>
        )}

        <View style={styles.actions}>
          {record.status === MaintenanceStatus.SCHEDULED && (
            <>
              <Button 
                mode="contained" 
                onPress={() => handleStatusChange(MaintenanceStatus.IN_PROGRESS)}
                loading={actionLoading}
                style={styles.button}
              >
                Iniciar
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => handleStatusChange(MaintenanceStatus.CANCELLED)}
                loading={actionLoading}
                style={styles.button}
                textColor={theme.colors.error}
              >
                Cancelar
              </Button>
            </>
          )}
          
          {record.status === MaintenanceStatus.IN_PROGRESS && (
            <Button 
              mode="contained" 
              onPress={() => handleStatusChange(MaintenanceStatus.COMPLETED)}
              loading={actionLoading}
              style={styles.button}
            >
              Completar
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    color: '#666',
    marginTop: 8,
  },
  text: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  actions: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  }
});
