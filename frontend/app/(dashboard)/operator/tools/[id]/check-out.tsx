import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import { getToolById, checkInTool, Tool } from '../../../../../services/toolService';

// Schema for Check-in (Return)
const checkInSchema = z.object({
  location_id: z.coerce.number().min(1, 'Ubicación es requerida'),
  condition_id: z.coerce.number().min(1, 'Condición es requerida'),
  notes: z.string().optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

export default function CheckOutToolScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const toolId = Number(id);
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);

  const { control, handleSubmit, setValue } = useForm({
    resolver: zodResolver(checkInSchema),
  });

  useEffect(() => {
    loadTool();
  }, [id]);

  const loadTool = async () => {
    try {
      setLoading(true);
      const data = await getToolById(toolId);
      setTool(data);
      // Pre-fill condition if available? Or force re-entry.
      // Better to let user specify current condition upon return.
    } catch (error) {
      console.error('Error loading tool:', error);
      Alert.alert('Error', 'No se pudo cargar la herramienta');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CheckInFormData) => {
    try {
      setLoading(true);
      // "Check-out" in user prompt context for operator likely means "Return/Check-in" 
      // as they are "registering exit" from their possession.
      // Backend endpoint is `check-in` (return to warehouse).
      await checkInTool(toolId, data);
      Alert.alert('Éxito', 'Herramienta devuelta/registrada correctamente');
      router.back();
    } catch (error) {
      console.error('Error returning tool:', error);
      Alert.alert('Error', 'No se pudo registrar la devolución');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !tool) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Registrar Salida / Devolución</Text>
      
      <View style={styles.info}>
        <Text variant="titleMedium">Herramienta: {tool.serial_number}</Text>
        <Text variant="bodyMedium">Estado actual: {tool.status}</Text>
      </View>

      <View style={styles.form}>
        <Input
          control={control as any}
          name="location_id"
          label="ID Ubicación de Destino (Almacén)"
          keyboardType="numeric"
          placeholder="Escanee o ingrese ID ubicación"
        />

        <Input
          control={control as any}
          name="condition_id"
          label="ID Condición (Estado Actual)"
          keyboardType="numeric"
        />

        <Input
          control={control as any}
          name="notes"
          label="Notas"
          multiline
          numberOfLines={3}
        />

        <Button 
          variant="primary" 
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.button}
        >
          Confirmar Registro
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    marginBottom: 24,
  },
  info: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  form: {
    gap: 16,
  },
  loader: {
    marginTop: 32,
  },
  button: {
    marginTop: 16,
  },
});
