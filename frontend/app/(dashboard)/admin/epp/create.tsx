import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, HelperText, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createEPP, EPPCreate } from '../../../../services/eppService';
import { getProducts, Product } from '../../../../services/productService';
import { Input } from '../../../../components/Input';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';

const schema = z.object({
  product_id: z.number().min(1, 'Seleccione un producto'),
  serial_number: z.string().optional(),
  size: z.string().optional(),
  certification: z.string().optional(),
  useful_life_days: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateEPPScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      product_id: 0,
      serial_number: '',
      size: '',
      certification: '',
      useful_life_days: '',
      notes: '',
    },
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts({ limit: 100 });
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los productos',
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await createEPP({
        ...data,
        useful_life_days: data.useful_life_days ? Number(data.useful_life_days) : undefined,
      });
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'EPP creado correctamente',
      });
      router.back();
    } catch (error) {
      console.error('Error creating EPP:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo crear el EPP',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Registrar Nuevo EPP" />
        <Card.Content>
          {loadingProducts ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <View style={styles.inputContainer}>
              <Text style={{ color: theme.colors.onSurface, marginBottom: 5 }}>Producto *</Text>
              <View style={[styles.pickerContainer, { borderColor: errors.product_id ? theme.colors.error : theme.colors.outline }]}>
                <Controller
                  control={control}
                  name="product_id"
                  render={({ field: { onChange, value } }) => (
                    <Picker
                      selectedValue={value}
                      onValueChange={(itemValue: number) => onChange(Number(itemValue))}
                      style={{ color: theme.colors.onSurface }}
                    >
                      <Picker.Item label="Seleccione un producto..." value={0} />
                      {products.map((product) => (
                        <Picker.Item key={product.id} label={`${product.name} (${product.sku})`} value={product.id} />
                      ))}
                    </Picker>
                  )}
                />
              </View>
              {errors.product_id && (
                <HelperText type="error" visible={true}>
                  {errors.product_id.message}
                </HelperText>
              )}
            </View>
          )}

          <Input<FormData>
            label="Número de Serie"
            name="serial_number"
            control={control}
            error={errors.serial_number?.message}
            placeholder="Ej. SN-12345"
          />

          <Input<FormData>
            label="Talla"
            name="size"
            control={control}
            error={errors.size?.message}
            placeholder="Ej. L, 42, Única"
          />

          <Input<FormData>
            label="Certificación"
            name="certification"
            control={control}
            error={errors.certification?.message}
            placeholder="Ej. ANSI Z87.1"
          />

          <Input<FormData>
            label="Vida Útil (días)"
            name="useful_life_days"
            control={control}
            error={errors.useful_life_days?.message}
            keyboardType="numeric"
            placeholder="Ej. 365"
          />

          <Input<FormData>
            label="Notas"
            name="notes"
            control={control}
            error={errors.notes?.message}
            multiline
            numberOfLines={3}
            placeholder="Observaciones adicionales..."
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Guardar EPP
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
  loader: {
    marginVertical: 20,
  },
  inputContainer: {
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
});
