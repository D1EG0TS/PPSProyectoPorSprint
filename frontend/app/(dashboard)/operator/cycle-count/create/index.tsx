import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, SegmentedButtons, Surface, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { inventoryService, Warehouse } from '@/services/inventoryService';
import { Colors } from '@/constants/Colors';

export default function CreateCycleCountScreen() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await inventoryService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
      Alert.alert('Error', 'Error al cargar almacenes');
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedWarehouse) {
      Alert.alert('Error', 'Selecciona un almacén');
      return;
    }

    setLoading(true);
    try {
      const result = await inventoryService.createCycleCount({
        warehouse_id: selectedWarehouse,
        priority,
        notes: notes || undefined,
      });

      Alert.alert('Éxito', `Conteo cíclico ${result.request_number} creado`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error creating cycle count:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Error al crear el conteo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.content}>
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Almacén</Text>
          <Text variant="bodySmall" style={styles.description}>
            Selecciona el almacén donde se realizará el conteo cíclico
          </Text>
          
          <View style={styles.chipContainer}>
            {warehouses.map(wh => (
              <Chip
                key={wh.id}
                selected={selectedWarehouse === wh.id}
                onPress={() => setSelectedWarehouse(wh.id)}
                style={styles.warehouseChip}
                icon="warehouse"
              >
                {wh.name}
              </Chip>
            ))}
          </View>
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Prioridad</Text>
          <Text variant="bodySmall" style={styles.description}>
            Define la urgencia del conteo
          </Text>
          
          <SegmentedButtons
            value={priority}
            onValueChange={(value) => setPriority(value as 'LOW' | 'NORMAL' | 'HIGH')}
            buttons={[
              { value: 'LOW', label: 'Baja', icon: 'clock-outline' },
              { value: 'NORMAL', label: 'Normal', icon: 'clock' },
              { value: 'HIGH', label: 'Alta', icon: 'clock-fast' },
            ]}
            style={styles.segmented}
          />
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Notas (opcional)</Text>
          <TextInput
            label="Notas adicionales"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Ej: Conteo mensual de zona A"
          />
        </Surface>

        <Surface style={styles.infoSection} elevation={0}>
          <Text variant="titleSmall" style={styles.infoTitle}>¿Qué sucede al crear un conteo?</Text>
          <View style={styles.infoItem}>
            <Text variant="bodyMedium" style={styles.infoBullet}>1.</Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Se listarán todos los productos en el almacén seleccionado
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text variant="bodyMedium" style={styles.infoBullet}>2.</Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Los operadores podrán contar cada producto y registrar el stock
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text variant="bodyMedium" style={styles.infoBullet}>3.</Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Al completar, se mostrarán las varianzas detectadas
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text variant="bodyMedium" style={styles.infoBullet}>4.</Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Un administrador puede aprobar las varianzas y generar ajustes automáticos
            </Text>
          </View>
        </Surface>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.actionButton}
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleCreate}
            loading={loading}
            disabled={loading || !selectedWarehouse}
            style={styles.actionButton}
            icon="check"
          >
            Crear Conteo
          </Button>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: Colors.white,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: Colors.text,
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  warehouseChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  segmented: {
    marginTop: 8,
  },
  infoSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: Colors.surface,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.text,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoBullet: {
    fontWeight: 'bold',
    marginRight: 8,
    color: Colors.primary,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
  },
});
