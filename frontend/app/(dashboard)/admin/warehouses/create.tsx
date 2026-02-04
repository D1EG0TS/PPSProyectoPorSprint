import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Button } from '../../../../components/Button';
import { Input } from '../../../../components/Input';
import { FormGroup } from '../../../../components/FormGroup';
import { warehouseService } from '../../../../services/warehouseService';

export default function CreateWarehouseScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code) newErrors.code = 'El código es requerido';
    if (!formData.name) newErrors.name = 'El nombre es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      await warehouseService.createWarehouse(formData);
      Alert.alert('Éxito', 'Almacén creado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      const msg = error.response?.data?.detail || 'No se pudo crear el almacén';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Crear Almacén</Text>
      </View>

      <View style={styles.form}>
        <FormGroup label="Código" error={errors.code}>
          <Input
            value={formData.code}
            onChangeText={(text) => setFormData({ ...formData, code: text })}
            placeholder="Ej: WH-001"
            autoCapitalize="characters"
          />
        </FormGroup>

        <FormGroup label="Nombre" error={errors.name}>
          <Input
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Nombre del almacén"
          />
        </FormGroup>

        <FormGroup label="Ubicación Física (Opcional)">
          <Input
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder="Dirección o descripción"
          />
        </FormGroup>

        <View style={styles.actions}>
          <Button 
            mode="outlined" 
            onPress={() => router.back()}
            style={styles.button}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSubmit}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Crear
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  form: {
    maxWidth: 600,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 16,
  },
  button: {
    minWidth: 120,
  }
});
