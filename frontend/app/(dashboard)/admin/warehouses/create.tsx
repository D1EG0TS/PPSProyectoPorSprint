import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Switch, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Button } from '../../../../components/Button';
import { Input } from '../../../../components/Input';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { warehouseService } from '../../../../services/warehouseService';
import { Layout } from '../../../../constants/Layout';

export default function CreateWarehouseScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    is_active: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
      setSaving(true);
      await warehouseService.createWarehouse(formData);
      Alert.alert('Éxito', 'Almacén creado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      const msg = error.response?.data?.detail || 'No se pudo crear el almacén';
      if (msg.includes('Code already exists')) {
        setErrors({ ...errors, code: 'Este código ya está en uso' });
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>Nuevo Almacén</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Registre un nuevo almacén o bodega</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Código"
          value={formData.code}
          onChangeText={(text) => setFormData({ ...formData, code: text })}
          placeholder="Ej: WH-001"
          error={errors.code}
          autoCapitalize="characters"
          containerStyle={styles.input}
        />

        <Input
          label="Nombre"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Nombre del almacén"
          error={errors.name}
          containerStyle={styles.input}
        />

        <Input
          label="Ubicación Física"
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
          placeholder="Dirección o descripción"
          containerStyle={styles.input}
        />

        <View style={[styles.switchContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Activo</Text>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Layout.spacing.lg,
  },
  form: {
    maxWidth: 600,
  },
  input: {
    marginBottom: Layout.spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Layout.spacing.md,
    gap: Layout.spacing.md,
  },
  button: {
    minWidth: 120,
  }
});
