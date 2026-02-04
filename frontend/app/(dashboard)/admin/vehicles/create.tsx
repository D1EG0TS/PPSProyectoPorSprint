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

  const onSubmit = async (data: any) => {
    try {
      await vehicleService.create({
        ...data,
        year: Number(data.year),
        odometer: Number(data.odometer || 0),
      });
      router.back();
    } catch (error) {
      console.error(error);
      alert('Failed to create vehicle');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Register New Vehicle</Text>
      
      <Input control={control} name="vin" label="VIN" rules={{ required: "VIN is required" }} />
      <Input control={control} name="license_plate" label="License Plate" rules={{ required: "Plate is required" }} />
      <Input control={control} name="brand" label="Brand" rules={{ required: "Brand is required" }} />
      <Input control={control} name="model" label="Model" rules={{ required: "Model is required" }} />
      <Input control={control} name="year" label="Year" keyboardType="numeric" rules={{ required: "Year is required" }} />
      <Input control={control} name="odometer" label="Odometer (km)" keyboardType="numeric" />
      
      <Text style={styles.label}>Status</Text>
      <Controller
        control={control}
        name="status"
        defaultValue={VehicleStatus.AVAILABLE}
        render={({ field: { onChange, value } }) => (
            <View style={styles.pickerContainer}>
                <Picker selectedValue={value} onValueChange={onChange}>
                    {Object.values(VehicleStatus).map(s => <Picker.Item key={s} label={s} value={s} />)}
                </Picker>
            </View>
        )}
      />

      <Input control={control} name="insurance_policy" label="Insurance Policy (Optional)" />
      <Input control={control} name="insurance_expiration" label="Insurance Expiration (YYYY-MM-DD)" placeholder="2025-12-31" />

      <Button mode="contained" onPress={handleSubmit(onSubmit)} style={styles.button}>
        Create Vehicle
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
