import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { Input } from '../../../../components/Input';
import vehicleService, { VehicleStatus } from '../../../../services/vehicleService';
import { Picker } from '@react-native-picker/picker';

const CreateVehicleScreen = () => {
  const { control, handleSubmit, formState: { errors } } = useForm();
  const router = useRouter();

  const statusLabels: Record<VehicleStatus, string> = {
    [VehicleStatus.AVAILABLE]: 'DISPONIBLE',
    [VehicleStatus.ASSIGNED]: 'ASIGNADO',
    [VehicleStatus.MAINTENANCE]: 'EN MANTENIMIENTO',
    [VehicleStatus.INACTIVE]: 'INACTIVO',
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        year: Number(data.year),
        odometer: Number(data.odometer || 0),
        // Handle optional empty strings as null/undefined to avoid backend validation errors
        insurance_policy: data.insurance_policy || null,
        insurance_expiration: data.insurance_expiration || null,
      };

      await vehicleService.create(payload);
      router.back();
    } catch (error: any) {
      console.error(error);
      let errorMessage = 'Error al crear el vehículo';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Handle Pydantic validation errors (array of objects)
          errorMessage = detail.map((err: any) => `${err.loc?.join('.')} : ${err.msg}`).join('\n');
        } else if (typeof detail === 'object') {
             errorMessage = JSON.stringify(detail);
        } else {
          errorMessage = String(detail);
        }
      }
      
      alert(errorMessage);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Registrar Nuevo Vehículo</Text>
      
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
                    {Object.values(VehicleStatus).map(s => <Picker.Item key={s} label={statusLabels[s] || s} value={s} />)}
                </Picker>
            </View>
        )}
      />

      <Input control={control} name="insurance_policy" label="Póliza de Seguro (Opcional)" />
      <Input control={control} name="insurance_expiration" label="Vencimiento Seguro (AAAA-MM-DD)" placeholder="2025-12-31" />

      <Button mode="contained" onPress={handleSubmit(onSubmit)} style={styles.button}>
        Registrar Vehículo
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
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
  }
});

export default CreateVehicleScreen;
