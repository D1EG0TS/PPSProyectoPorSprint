import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Card, Button, TextInput, Menu, IconButton, HelperText, useTheme, Portal, Dialog, List, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';

import { ScrollableContent } from '../../../../components/ScrollableContent';
import { LoadingScreen } from '../../../../components/LoadingScreen';
import { warehouseService, Warehouse } from '../../../../services/warehouseService';
import { getProducts, Product } from '../../../../services/productService';
import { createMovementRequest, submitMovementRequest, MovementType } from '../../../../services/movementService';
import { Colors } from '../../../../constants/Colors';

// Schema Definition
const itemSchema = z.object({
  product_id: z.number().min(1, 'Producto requerido'),
  product_name: z.string(), // Helper for UI
  quantity: z.number().min(1, 'Cantidad debe ser mayor a 0'),
  notes: z.string().optional(),
});

const movementSchema = z.object({
  type: z.nativeEnum(MovementType),
  source_warehouse_id: z.number().optional(),
  destination_warehouse_id: z.number().optional(),
  reason: z.string().min(3, 'Razón requerida'),
  reference: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Debe agregar al menos un ítem'),
}).refine((data) => {
  if (data.type === MovementType.IN) {
    return !!data.destination_warehouse_id;
  }
  if (data.type === MovementType.OUT || data.type === MovementType.ADJUSTMENT) {
    return !!data.source_warehouse_id;
  }
  if (data.type === MovementType.TRANSFER) {
    return !!data.source_warehouse_id && !!data.destination_warehouse_id && data.source_warehouse_id !== data.destination_warehouse_id;
  }
  return true;
}, {
  message: "Almacenes inválidos para el tipo de movimiento seleccionado",
  path: ["source_warehouse_id"], // Highlight source broadly
});

type MovementFormData = z.infer<typeof movementSchema>;

export default function CreateMovementScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // Product Selection State
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: MovementType.IN,
      reason: '',
      items: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const selectedType = watch('type');

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (showProductDialog) {
      searchProducts('');
    }
  }, [showProductDialog]);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error cargando almacenes' });
    }
  };

  const searchProducts = async (query: string) => {
    setSearchingProducts(true);
    try {
      const data = await getProducts({ search: query, limit: 20 });
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setSearchingProducts(false);
    }
  };

  const onAddProduct = (product: Product) => {
    append({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      notes: ''
    });
    setShowProductDialog(false);
  };

  const onSubmit = async (data: MovementFormData) => {
    setLoading(true);
    try {
      // 1. Create Request
      const request = await createMovementRequest({
        type: data.type,
        source_warehouse_id: data.type === MovementType.IN ? undefined : data.source_warehouse_id,
        destination_warehouse_id: (data.type === MovementType.OUT || data.type === MovementType.ADJUSTMENT) ? undefined : data.destination_warehouse_id,
        reason: data.reason,
        reference: data.reference,
        items: data.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes
        }))
      });

      // 2. Auto-submit (Pending Approval)
      await submitMovementRequest(request.id);

      Toast.show({
        type: 'success',
        text1: 'Movimiento creado',
        text2: 'La solicitud ha sido enviada para aprobación'
      });
      
      router.back();
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error al crear movimiento',
        text2: error.response?.data?.detail || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <Text variant="headlineMedium" style={styles.title}>Nuevo Movimiento</Text>
        
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            {/* Movement Type */}
            <View style={styles.field}>
              <Text variant="labelLarge">Tipo de Movimiento</Text>
              <View style={styles.pickerContainer}>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <Picker
                      selectedValue={value}
                      onValueChange={onChange}
                      style={styles.picker}
                    >
                      <Picker.Item label="Entrada (Compra/Devolución)" value={MovementType.IN} />
                      <Picker.Item label="Salida (Venta/Merma)" value={MovementType.OUT} />
                      <Picker.Item label="Transferencia" value={MovementType.TRANSFER} />
                      <Picker.Item label="Ajuste de Inventario" value={MovementType.ADJUSTMENT} />
                    </Picker>
                  )}
                />
              </View>
            </View>

            {/* Warehouses Logic */}
            {(selectedType !== MovementType.IN) && (
              <View style={styles.field}>
                <Text variant="labelLarge">Almacén Origen</Text>
                <View style={styles.pickerContainer}>
                  <Controller
                    control={control}
                    name="source_warehouse_id"
                    render={({ field: { onChange, value } }) => (
                      <Picker
                        selectedValue={value}
                        onValueChange={(v) => onChange(Number(v))}
                        style={styles.picker}
                      >
                        <Picker.Item label="Seleccionar origen..." value={0} />
                        {warehouses.map(w => (
                          <Picker.Item key={w.id} label={w.name} value={w.id} />
                        ))}
                      </Picker>
                    )}
                  />
                </View>
                {errors.source_warehouse_id && <HelperText type="error">{errors.source_warehouse_id.message}</HelperText>}
              </View>
            )}

            {(selectedType !== MovementType.OUT && selectedType !== MovementType.ADJUSTMENT) && (
               <View style={styles.field}>
               <Text variant="labelLarge">Almacén Destino</Text>
               <View style={styles.pickerContainer}>
                 <Controller
                   control={control}
                   name="destination_warehouse_id"
                   render={({ field: { onChange, value } }) => (
                     <Picker
                       selectedValue={value}
                       onValueChange={(v) => onChange(Number(v))}
                       style={styles.picker}
                     >
                       <Picker.Item label="Seleccionar destino..." value={0} />
                       {warehouses.map(w => (
                         <Picker.Item key={w.id} label={w.name} value={w.id} />
                       ))}
                     </Picker>
                   )}
                 />
               </View>
               {errors.destination_warehouse_id && <HelperText type="error">{errors.destination_warehouse_id.message}</HelperText>}
             </View>
            )}

            {/* Reason & Reference */}
            <Controller
              control={control}
              name="reason"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Razón / Justificación"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors.reason}
                />
              )}
            />
             {errors.reason && <HelperText type="error">{errors.reason.message}</HelperText>}

            <Controller
              control={control}
              name="reference"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Referencia (Opcional)"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Ej. Orden de Compra #123"
                />
              )}
            />

            <Divider style={styles.divider} />
            
            {/* Items Section */}
            <View style={styles.itemsHeader}>
              <Text variant="titleMedium">Ítems ({fields.length})</Text>
              <Button mode="outlined" onPress={() => setShowProductDialog(true)} icon="plus">
                Agregar Producto
              </Button>
            </View>
            
            {errors.items && <HelperText type="error">{errors.items.message}</HelperText>}

            {fields.map((field, index) => (
              <View key={field.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={{ fontWeight: 'bold' }}>{field.product_name}</Text>
                  <Controller
                    control={control}
                    name={`items.${index}.notes`}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        label="Notas"
                        value={value}
                        onChangeText={onChange}
                        mode="flat"
                        dense
                        style={{ backgroundColor: 'transparent', height: 40 }}
                      />
                    )}
                  />
                </View>
                <View style={styles.itemActions}>
                   <Controller
                    control={control}
                    name={`items.${index}.quantity`}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        label="Cant."
                        value={String(value)}
                        onChangeText={v => onChange(Number(v))}
                        keyboardType="numeric"
                        mode="outlined"
                        dense
                        style={{ width: 80, textAlign: 'center' }}
                      />
                    )}
                  />
                  <IconButton icon="delete" iconColor={Colors.error} onPress={() => remove(index)} />
                </View>
              </View>
            ))}

          </Card.Content>
          <Card.Actions>
            <Button onPress={() => router.back()}>Cancelar</Button>
            <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={loading} disabled={loading}>
              Crear Solicitud
            </Button>
          </Card.Actions>
        </Card>
      </ScrollableContent>

      {/* Product Selection Dialog */}
      <Portal>
        <Dialog visible={showProductDialog} onDismiss={() => setShowProductDialog(false)} style={{ maxHeight: '80%' }}>
          <Dialog.Title>Seleccionar Producto</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Buscar..."
              value={productSearch}
              onChangeText={(text) => {
                setProductSearch(text);
                searchProducts(text);
              }}
              mode="outlined"
              style={{ marginBottom: 10 }}
            />
            {searchingProducts ? (
              <ActivityIndicator style={{ margin: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {products.map(product => (
                  <List.Item
                    key={product.id}
                    title={product.name}
                    description={`SKU: ${product.sku}`}
                    onPress={() => onAddProduct(product)}
                    left={props => <List.Icon {...props} icon="package-variant" />}
                  />
                ))}
                {products.length === 0 && <Text style={{ textAlign: 'center', marginTop: 20 }}>No se encontraron productos</Text>}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowProductDialog(false)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 20,
  },
  cardContent: {
    gap: 16,
  },
  field: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginTop: 4,
  },
  picker: {
    height: Platform.OS === 'web' ? 40 : 50,
  },
  divider: {
    marginVertical: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
