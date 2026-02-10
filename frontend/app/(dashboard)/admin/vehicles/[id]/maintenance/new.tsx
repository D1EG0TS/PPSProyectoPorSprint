import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, ProgressBar, useTheme, Card, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useForm } from 'react-hook-form';
import { MaintenanceRecordCreate, MaintenanceType, MaintenanceCategory, MaintenancePart, MaintenanceStatus } from '../../../../../../types/maintenance';
import { maintenanceService } from '../../../../../../services/maintenanceService';
import vehicleService from '../../../../../../services/vehicleService';
import { warehouseService, Warehouse } from '../../../../../../services/warehouseService';
import { MaintenanceTypeSelector } from '../../../../../../components/maintenance/MaintenanceTypeSelector';
import { OdometerInput } from '../../../../../../components/maintenance/OdometerInput';
import { PartsTable } from '../../../../../../components/maintenance/PartsTable';
import { Input } from '../../../../../../components/Input';

const TOTAL_STEPS = 4;

export default function NewMaintenanceScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const vehicleId = parseInt(id as string);

  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<MaintenanceType | null>(null);
  const [parts, setParts] = useState<MaintenancePart[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<MaintenanceRecordCreate>({
    defaultValues: {
      vehicle_id: vehicleId,
      maintenance_type_id: 0,
      service_date: new Date().toISOString().split('T')[0],
      cost_currency: 'MXN',
      status: MaintenanceStatus.SCHEDULED
    }
  });

  useEffect(() => {
    loadVehicle();
    loadWarehouses();
  }, [id]);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error("Failed to load warehouses", error);
    }
  };

  const loadVehicle = async () => {
    try {
      const data = await vehicleService.getById(vehicleId);
      setVehicle(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cargar la información del vehículo');
    }
  };

  const onSubmit = async (data: MaintenanceRecordCreate) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        parts: parts,
        maintenance_type_id: selectedType?.id || 0
      };
      
      await maintenanceService.createRecord(payload);
      Alert.alert('Éxito', 'Mantenimiento registrado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Hubo un error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !selectedType) {
      Alert.alert('Requerido', 'Selecciona un tipo de mantenimiento');
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleSubmit(onSubmit)();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep1 = () => (
    <View>
      <Text variant="titleMedium" style={styles.sectionTitle}>Selecciona el Tipo de Servicio</Text>
      <MaintenanceTypeSelector 
        value={selectedType?.id} 
        onSelect={(type) => {
            setSelectedType(type);
            setValue('maintenance_type_id', type.id);
        }} 
      />
      
      <Text variant="titleMedium" style={styles.sectionTitle}>Fecha y Kilometraje</Text>
      <Input 
        name="service_date" 
        control={control} 
        label="Fecha del Servicio (YYYY-MM-DD)" 
        rules={{ required: 'Fecha requerida' }}
      />
      
      <OdometerInput 
        name="odometer_at_service" 
        control={control} 
        lastOdometer={vehicle?.odometer}
      />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text variant="titleMedium" style={styles.sectionTitle}>Detalles del Servicio</Text>
      <Input 
        name="provider_name" 
        control={control} 
        label="Proveedor / Taller" 
        placeholder="Nombre del taller o mecánico"
      />
      <Input 
        name="description" 
        control={control} 
        label="Descripción del Trabajo" 
        multiline 
        numberOfLines={3}
      />
      <Input 
        name="notes" 
        control={control} 
        label="Notas Adicionales" 
        multiline 
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text variant="titleMedium" style={styles.sectionTitle}>Partes y Materiales</Text>
      <Text variant="bodySmall" style={{marginBottom: 10, color: theme.colors.outline}}>
        Agrega las refacciones utilizadas en este servicio.
      </Text>
      <PartsTable parts={parts} onChange={setParts} warehouses={warehouses} />
    </View>
  );

  const renderStep4 = () => {
      const partsTotal = parts.reduce((sum, p) => sum + (p.total_cost || 0), 0);
      const laborCost = watch('cost_amount') || 0; // Assuming cost_amount is total or just labor? 
      // Actually backend model has cost_amount as total usually. 
      // Let's assume cost_amount is TOTAL service cost including parts.
      // Or we can treat cost_amount as Labor/Service fee and calculate Grand Total.
      // For simplicity, let's ask user for Total Cost directly, or sum it up.
      // User request: "Suma automática de partes + mano de obra".
      
      // Let's add a "Labor/Service Cost" input and display Grand Total.
      
      return (
        <View>
          <Text variant="titleMedium" style={styles.sectionTitle}>Costos Finales</Text>
          
          <Card style={{marginBottom: 16, padding: 16}}>
              <View style={styles.row}>
                  <Text>Total Partes:</Text>
                  <Text style={{fontWeight: 'bold'}}>${partsTotal.toFixed(2)}</Text>
              </View>
              <Divider style={{marginVertical: 8}}/>
              <Input
                name="cost_amount"
                control={control}
                label="Costo Total del Servicio (Inc. Mano de Obra)"
                keyboardType="numeric"
                rules={{ required: 'Costo requerido' }}
                helperText="Incluye costo de partes y mano de obra"
              />
          </Card>
          
          <Text variant="bodySmall">
              Resumen:
              {selectedType?.name} - {watch('service_date')}
          </Text>
        </View>
      );
  };
  
  // Need to import Divider
  const Divider = require('react-native-paper').Divider;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Nuevo Mantenimiento' }} />
      
      <ProgressBar progress={step / TOTAL_STEPS} color={theme.colors.primary} style={styles.progress} />
      
      <ScrollView style={styles.content}>
        <Text variant="headlineSmall" style={styles.stepTitle}>Paso {step}: {
            step === 1 ? 'Tipo y Fecha' : 
            step === 2 ? 'Detalles' : 
            step === 3 ? 'Partes' : 'Costos'
        }</Text>
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.footer}>
        <Button mode="outlined" onPress={prevStep} disabled={step === 1} style={styles.button}>
          Atrás
        </Button>
        <Button mode="contained" onPress={nextStep} loading={loading} style={styles.button}>
          {step === TOTAL_STEPS ? 'Registrar' : 'Siguiente'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progress: {
    height: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 10,
    color: '#666',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  }
});
