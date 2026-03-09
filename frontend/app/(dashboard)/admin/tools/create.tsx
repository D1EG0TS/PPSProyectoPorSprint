import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Input } from '../../../../components/Input';
import { Button } from '../../../../components/Button';
import { createTool, updateTool, getToolById, ToolStatus } from '../../../../services/toolService';
import { getProducts, Product } from '../../../../services/productService';

const toolSchema = z.object({
  product_id: z.coerce.number().min(1, 'Producto es requerido'),
  serial_number: z.string().min(1, 'Serial es requerido'),
  condition_id: z.coerce.number().min(1, 'Condición es requerida'),
  status: z.nativeEnum(ToolStatus).optional(),
});

type ToolFormData = z.infer<typeof toolSchema>;

export default function CreateToolScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  
  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(toolSchema),
    defaultValues: {
      status: ToolStatus.AVAILABLE,
    }
  });

  useEffect(() => {
    loadDependencies();
    if (isEditing) {
      loadTool(Number(id));
    }
  }, [id]);

  const loadDependencies = async () => {
    try {
      const prods = await getProducts({ limit: 100 });
      setProducts(prods);
    } catch (error) {
      console.error('Error loading dependencies:', error);
    }
  };

  const loadTool = async (toolId: number) => {
    try {
      setLoading(true);
      const tool = await getToolById(toolId);
      setValue('product_id', tool.product_id);
      setValue('serial_number', tool.serial_number);
      setValue('condition_id', tool.condition_id);
      setValue('status', tool.status);
    } catch (error) {
      console.error('Error loading tool:', error);
      Alert.alert('Error', 'No se pudo cargar la herramienta');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ToolFormData) => {
    try {
      setLoading(true);
      if (isEditing) {
        await updateTool(Number(id), data);
        Alert.alert('Éxito', 'Herramienta actualizada correctamente');
      } else {
        await createTool(data);
        Alert.alert('Éxito', 'Herramienta creada correctamente');
      }
      router.back();
    } catch (error) {
      console.error('Error saving tool:', error);
      Alert.alert('Error', 'No se pudo guardar la herramienta');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />;
  }

  return (
    <ScreenContainer>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        {isEditing ? 'Editar Herramienta' : 'Nueva Herramienta'}
      </Text>

      <View style={styles.form}>
        <Input
          control={control as any}
          name="product_id"
          label="ID Producto (Simulando Select)"
          keyboardType="numeric"
          placeholder="Seleccione Producto (ID)"
        />

        <Input
          control={control as any}
          name="serial_number"
          label="Número de Serie"
          autoCapitalize="characters"
        />

        <Input
          control={control as any}
          name="condition_id"
          label="ID Condición (1=Nuevo, 2=Usado, etc)"
          keyboardType="numeric"
        />
        
        {isEditing && (
           <Input
            control={control as any}
            name="status"
            label="Estado"
            editable={false}
           />
        )}

        <Button
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.button}
        >
          {isEditing ? 'Actualizar' : 'Crear'}
        </Button>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 24,
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
