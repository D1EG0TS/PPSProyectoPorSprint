import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Switch, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import { FormGroup } from '../../../../../components/FormGroup';
import { warehouseService } from '../../../../../services/warehouseService';

export default function EditWarehouseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    is_active: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadWarehouse(Number(id));
    }
  }, [id]);

  const loadWarehouse = async (warehouseId: number) => {
    try {
      setLoading(true);
      const data = await warehouseService.getWarehouse(warehouseId);
      setFormData({
        code: data.code,
        name: data.name,
        location: data.location || '',
        is_active: data.is_active
      });
    } catch (error) {
      console.error('Error loading warehouse:', error);
      Alert.alert('Error', 'No se pudo cargar el almacén');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'El nombre es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      await warehouseService.updateWarehouse(Number(id), {
        name: formData.name,
        location: formData.location,
        is_active: formData.is_active
      });
      Alert.alert('Éxito', 'Almacén actualizado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      const msg = error.response?.data?.detail || 'No se pudo actualizar el almacén';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Editar Almacén</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>{formData.code}</Text>
      </View>

      <View style={styles.form}>
        <FormGroup label="Nombre" error={errors.name}>
          <Input
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Nombre del almacén"
          />
        </FormGroup>

        <FormGroup label="Ubicación Física">
          <Input
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder="Dirección o descripción"
          />
        </FormGroup>

        <View style={styles.switchContainer}>
          <Text variant="bodyLarge">Activo</Text>
          <Switch
            value={formData.is_active}
            onValueChange={(val) => setFormData({ ...formData, is_active: val })}
            color={theme.colors.primary}
          />
        </View>

        <View style={styles.actions}>
          <Button 
            variant="outline" 
            onPress={() => router.back()}
            style={styles.button}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onPress={handleSubmit}
            style={styles.button}
            loading={saving}
            disabled={saving}
          >
            Guardar
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  form: {
    maxWidth: 600,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 8,
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
