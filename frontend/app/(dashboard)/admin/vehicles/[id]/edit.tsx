import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Input } from '../../../../../components/Input';
import vehicleService, { VehicleStatus } from '../../../../../services/vehicleService';
import { Picker } from '@react-native-picker/picker';

const EditVehicleScreen = () => {
  const { id } = useLocalSearchParams();
  const { control, handleSubmit, setValue, formState: { errors } } = useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const statusLabels: Record<VehicleStatus, string> = {
    [VehicleStatus.AVAILABLE]: 'DISPONIBLE',
    [VehicleStatus.ASSIGNED]: 'ASIGNADO',
    [VehicleStatus.MAINTENANCE]: 'EN MANTENIMIENTO',
    [VehicleStatus.INACTIVE]: 'INACTIVO',
  };

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        if (id) {
          const data = await vehicleService.getById(Number(id));
          setValue('vin', data.vin);
          setValue('license_plate', data.license_plate);
          setValue('brand', data.brand);
          setValue('model', data.model);
          setValue('year', data.year.toString());
          setValue('odometer', data.odometer.toString());
          setValue('status', data.status);
          setValue('insurance_policy', data.insurance_policy);
          setValue('insurance_expiration', data.insurance_expiration);
        }
      } catch (error) {
        console.error('Error fetching vehicle:', error);
        Alert.alert('Error', 'No se pudo cargar la información del vehículo');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id, setValue]);

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        year: Number(data.year),
        odometer: Number(data.odometer || 0),
        insurance_policy: data.insurance_policy || null,
        insurance_expiration: data.insurance_expiration || null,
      };

      await vehicleService.update(Number(id), payload);
      router.back();
    } catch (error: any) {
      console.error(error);
      let errorMessage = 'Error al actualizar el vehículo';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => `${err.loc?.join('.')} : ${err.msg}`).join('\n');
        } else if (typeof detail === 'object') {
             errorMessage = JSON.stringify(detail);
        } else {
          errorMessage = String(detail);
        }
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  if (loading) {
    return <View style={styles.container}><Text>Cargando...</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Editar Vehículo</Text>
      
      <Input control={control} name="vin" label="VIN" rules={{ required: "El VIN es requerido" }} />
      <Input control={control} name="license_plate" label="Placa" rules={{ required: "La placa es requerida" }} />
      <Input control={control} name="brand" label="Marca" rules={{ required: "La marca es requerida" }} />
      <Input control={control} name="model" label="Modelo" rules={{ required: "El modelo es requerido" }} />
      <Input control={control} name="year" label="Año" keyboardType="numeric" rules={{ required: "El año es requerido" }} />
      <Input control={control} name="odometer" label="Kilometraje (km)" keyboardType="numeric" />
      
      <Text style={styles.label}>Estado</Text>
      <Controller
        control={control}
        name="status"
        defaultValue={VehicleStatus.AVAILABLE}
        render={({ field: { onChange, value } }) => (
            <View style={styles.pickerContainer}>
                <Picker selectedValue={value} onValueChange={onChange}>
                    {Object.values(VehicleStatus).map((s) => <Picker.Item key={s} label={statusLabels[s as VehicleStatus] || s} value={s} />)}
                </Picker>
            </View>
        )}
      />

      <Input control={control} name="insurance_policy" label="Póliza de Seguro (Opcional)" />
      <Input control={control} name="insurance_expiration" label="Vencimiento Seguro (AAAA-MM-DD)" placeholder="2025-12-31" />

      <Button mode="contained" onPress={handleSubmit(onSubmit)} style={styles.button}>
        Guardar Cambios
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 5,
    marginTop: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 5,
  },
  button: {
    marginTop: 20,
    marginBottom: 20,
  }
});

export default EditVehicleScreen;
