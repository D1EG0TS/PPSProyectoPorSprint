import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, TextInput as PaperTextInput, Menu, IconButton, HelperText, useTheme, Portal, Dialog, List, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';

import { ScreenContainer } from '../../../../components/ScreenContainer';
import { LoadingScreen } from '../../../../components/LoadingScreen';
import { warehouseService, Warehouse } from '../../../../services/warehouseService';
import { getProducts, Product } from '../../../../services/productService';
import { createMovementRequest, submitMovementRequest, MovementType } from '../../../../services/movementService';
import { LocationSelectionDialog } from '../../../../components/locations/LocationSelectionDialog';
import { Colors } from '../../../../constants/Colors';
import { Input } from '../../../../components/Input';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Layout } from '../../../../constants/Layout';

// Schema Definition
const itemSchema = z.object({
  product_id: z.number().min(1, 'Producto requerido'),
  product_name: z.string(), // Helper for UI
  quantity: z.number().min(1, 'Cantidad debe ser mayor a 0'),
  notes: z.string().optional(),
  source_location_id: z.number().optional(),
  source_location_name: z.string().optional(), // Helper for UI
  destination_location_id: z.number().optional(),
  destination_location_name: z.string().optional(), // Helper for UI
});

const movementSchema = z.object({
  type: z.nativeEnum(MovementType),
  adjustment_mode: z.enum(['IN', 'OUT']).optional(),
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
    if (data.type === MovementType.ADJUSTMENT && data.adjustment_mode === 'IN') {
      return !!data.destination_warehouse_id;
    }
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
  
  // Location Selection State
  const [locationDialog, setLocationDialog] = useState({ visible: false, index: -1, type: 'source' as 'source' | 'destination' });

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: MovementType.IN,
      adjustment_mode: 'OUT',
      reason: '',
      items: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const selectedType = watch('type');
  const adjustmentMode = watch('adjustment_mode');
  const sourceWarehouseId = watch('source_warehouse_id');
  const destinationWarehouseId = watch('destination_warehouse_id');

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (showProductDialog) {
      searchProducts('');
    }
  }, [showProductDialog]);

  const openLocationDialog = (index: number, type: 'source' | 'destination') => {
    setLocationDialog({ visible: true, index, type });
  };

  const handleLocationSelect = (location: any) => {
    if (locationDialog.index >= 0) {
      if (locationDialog.type === 'source') {
        setValue(`items.${locationDialog.index}.source_location_id`, location.id);
        setValue(`items.${locationDialog.index}.source_location_name`, location.code);
        if (!sourceWarehouseId && location.warehouse_id) {
            setValue('source_warehouse_id', location.warehouse_id);
        } else if (sourceWarehouseId && sourceWarehouseId !== location.warehouse_id) {
            Alert.alert("Advertencia", "La ubicación seleccionada pertenece a un almacén diferente al ya asignado. Se actualizará el almacén origen.", [
                { text: "Cancelar", style: "cancel" },
                { text: "Actualizar", onPress: () => setValue('source_warehouse_id', location.warehouse_id) }
            ]);
        }
      } else {
        setValue(`items.${locationDialog.index}.destination_location_id`, location.id);
        setValue(`items.${locationDialog.index}.destination_location_name`, location.code);
        if (!destinationWarehouseId && location.warehouse_id) {
            setValue('destination_warehouse_id', location.warehouse_id);
        } else if (destinationWarehouseId && destinationWarehouseId !== location.warehouse_id) {
            Alert.alert("Advertencia", "La ubicación seleccionada pertenece a un almacén diferente al ya asignado. Se actualizará el almacén destino.", [
                { text: "Cancelar", style: "cancel" },
                { text: "Actualizar", onPress: () => setValue('destination_warehouse_id', location.warehouse_id) }
            ]);
        }
      }
    }
    setLocationDialog({ ...locationDialog, visible: false });
  };

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
        source_warehouse_id:
          data.type === MovementType.IN
            ? undefined
            : data.type === MovementType.ADJUSTMENT && data.adjustment_mode === 'IN'
              ? undefined
              : data.source_warehouse_id,
        destination_warehouse_id:
          data.type === MovementType.OUT
            ? undefined
            : data.type === MovementType.ADJUSTMENT && data.adjustment_mode !== 'IN'
              ? undefined
              : data.destination_warehouse_id,
        reason: data.reason,
        reference: data.reference,
        items: data.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes,
          source_location_id:
            data.type === MovementType.IN
              ? undefined
              : data.type === MovementType.ADJUSTMENT && data.adjustment_mode === 'IN'
                ? undefined
                : item.source_location_id,
          destination_location_id:
            data.type === MovementType.OUT
              ? undefined
              : data.type === MovementType.ADJUSTMENT && data.adjustment_mode !== 'IN'
                ? undefined
                : item.destination_location_id
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
    <ScreenContainer>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>Nuevo Movimiento</Text>
      
      <Card style={styles.card}>
        <View style={styles.cardContent}>
          {/* Movement Type */}
          <View style={styles.field}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Tipo de Movimiento</Text>
            <View style={[styles.pickerContainer, { borderColor: theme.colors.outline }]}>
              <Controller
                control={control}
                name="type"
                render={({ field: { onChange, value } }) => (
                  <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    style={[styles.picker, { color: theme.colors.onSurface }]}
                    dropdownIconColor={theme.colors.onSurface}
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

          {/* Warehouses Logic - Auto-selected via items but visible here */}
          {(selectedType === MovementType.OUT || selectedType === MovementType.TRANSFER || (selectedType === MovementType.ADJUSTMENT && adjustmentMode !== 'IN')) && (
            <View style={styles.field}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Almacén Origen</Text>
              {sourceWarehouseId ? (
                <View style={styles.warehouseChip}>
                    <Text variant="bodyLarge" style={{fontWeight: 'bold'}}>{warehouses.find(w => w.id === sourceWarehouseId)?.name || 'Desconocido'}</Text>
                    <IconButton icon="close-circle" onPress={() => setValue('source_warehouse_id', undefined)} />
                </View>
              ) : (
                <Text variant="bodyMedium" style={{color: theme.colors.outline}}>Seleccione una ubicación en los ítems para asignar automáticamente.</Text>
              )}
              {errors.source_warehouse_id && <HelperText type="error">{errors.source_warehouse_id.message}</HelperText>}
            </View>
          )}

          {(selectedType === MovementType.IN || selectedType === MovementType.TRANSFER || (selectedType === MovementType.ADJUSTMENT && adjustmentMode === 'IN')) && (
             <View style={styles.field}>
             <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Almacén Destino</Text>
             {destinationWarehouseId ? (
                <View style={styles.warehouseChip}>
                    <Text variant="bodyLarge" style={{fontWeight: 'bold'}}>{warehouses.find(w => w.id === destinationWarehouseId)?.name || 'Desconocido'}</Text>
                    <IconButton icon="close-circle" onPress={() => setValue('destination_warehouse_id', undefined)} />
                </View>
              ) : (
                <Text variant="bodyMedium" style={{color: theme.colors.outline}}>Seleccione una ubicación en los ítems para asignar automáticamente.</Text>
              )}
             {errors.destination_warehouse_id && <HelperText type="error">{errors.destination_warehouse_id.message}</HelperText>}
           </View>
          )}

          {selectedType === MovementType.ADJUSTMENT && (
            <View style={styles.field}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>Tipo de Ajuste</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button
                  variant={adjustmentMode === 'IN' ? 'primary' : 'outline'}
                  onPress={() => setValue('adjustment_mode', 'IN')}
                >
                  Aumentar
                </Button>
                <Button
                  variant={adjustmentMode !== 'IN' ? 'primary' : 'outline'}
                  onPress={() => setValue('adjustment_mode', 'OUT')}
                >
                  Disminuir
                </Button>
              </View>
            </View>
          )}

          {/* Reason & Reference */}
          <Controller
            control={control}
            name="reason"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Razón / Justificación"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                containerStyle={styles.input}
                error={errors.reason ? errors.reason.message : undefined}
              />
            )}
          />

          <Controller
            control={control}
            name="reference"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Referencia (Opcional)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                containerStyle={styles.input}
                placeholder="Ej. Orden de Compra #123"
              />
            )}
          />

          <Divider style={styles.divider} />
          
          {/* Items Section */}
          <View style={styles.itemsHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Ítems ({fields.length})</Text>
            <Button variant="outline" onPress={() => setShowProductDialog(true)} icon="plus">
              Agregar Producto
            </Button>
          </View>
          
          {errors.items && <HelperText type="error">{errors.items.message}</HelperText>}

          {fields.map((field, index) => (
            <View key={field.id} style={[styles.itemRow, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.itemInfo}>
                <Text style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>{field.product_name}</Text>
                
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                   {selectedType !== MovementType.IN && !(selectedType === MovementType.ADJUSTMENT && adjustmentMode === 'IN') && (
                     <Controller
                       control={control}
                       name={`items.${index}.source_location_name`}
                       render={({ field: { value } }) => (
                          <Input
                           label="Loc. Origen"
                           value={value || ''}
                           onChangeText={() => {}}
                           containerStyle={{ flex: 1 }}
                           right={<PaperTextInput.Icon icon="magnify" onPress={() => openLocationDialog(index, 'source')} />}
                           editable={false}
                         />
                       )}
                     />
                   )}
                   
                   {(selectedType !== MovementType.OUT && !(selectedType === MovementType.ADJUSTMENT && adjustmentMode !== 'IN')) && (
                      <Controller
                       control={control}
                       name={`items.${index}.destination_location_name`}
                       render={({ field: { value } }) => (
                          <Input
                           label="Loc. Destino"
                           value={value || ''}
                           onChangeText={() => {}}
                           containerStyle={{ flex: 1 }}
                           right={<PaperTextInput.Icon icon="magnify" onPress={() => openLocationDialog(index, 'destination')} />}
                           editable={false}
                         />
                       )}
                     />
                   )}
                 </View>

                <Controller
                  control={control}
                  name={`items.${index}.notes`}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Notas"
                      value={value || ''}
                      onChangeText={onChange}
                      containerStyle={{ marginTop: 8 }}
                    />
                  )}
                />
              </View>
              <View style={styles.itemActions}>
                 <Controller
                  control={control}
                  name={`items.${index}.quantity`}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Cant."
                      value={String(value)}
                      onChangeText={v => onChange(Number(v))}
                      keyboardType="numeric"
                      containerStyle={{ width: 80 }}
                    />
                  )}
                />
                <IconButton icon="delete" iconColor={theme.colors.error} onPress={() => remove(index)} />
              </View>
            </View>
          ))}

        </View>
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline }]}>
          <Button variant="text" onPress={() => router.back()} style={{ marginRight: 8 }}>Cancelar</Button>
          <Button variant="primary" onPress={handleSubmit(onSubmit)} loading={loading} disabled={loading}>
            Crear Solicitud
          </Button>
        </View>
      </Card>

      {/* Product Selection Dialog */}
      <Portal>
        <Dialog visible={showProductDialog} onDismiss={() => setShowProductDialog(false)} style={{ maxHeight: '80%', backgroundColor: theme.colors.surface }}>
          <Dialog.Title style={{ color: theme.colors.onSurface }}>Seleccionar Producto</Dialog.Title>
          <Dialog.Content>
            <Input
              label="Buscar..."
              value={productSearch}
              onChangeText={(text) => {
                setProductSearch(text);
                searchProducts(text);
              }}
              style={{ marginBottom: 10 }}
            />
            {searchingProducts ? (
              <ActivityIndicator style={{ margin: 20 }} color={theme.colors.primary} />
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {products.map(product => (
                  <List.Item
                    key={product.id}
                    title={product.name}
                    description={`SKU: ${product.sku}`}
                    titleStyle={{ color: theme.colors.onSurface }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    onPress={() => onAddProduct(product)}
                    left={props => <List.Icon {...props} icon="package-variant" color={theme.colors.primary} />}
                  />
                ))}
                {products.length === 0 && <Text style={{ textAlign: 'center', marginTop: 20, color: theme.colors.onSurfaceVariant }}>No se encontraron productos</Text>}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button variant="text" onPress={() => setShowProductDialog(false)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <LocationSelectionDialog
        visible={locationDialog.visible}
        onDismiss={() => setLocationDialog({ ...locationDialog, visible: false })}
        onSelect={handleLocationSelect}
        warehouseId={locationDialog.type === 'source' ? sourceWarehouseId : destinationWarehouseId}
        title={`Seleccionar ${locationDialog.type === 'source' ? 'Origen' : 'Destino'}`}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Layout.spacing.md,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 20,
  },
  cardContent: {
    gap: 16,
    padding: 16,
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16,
      borderTopWidth: 1,
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 16,
  },
  field: {
    marginBottom: 8,
  },
  input: {
    // backgroundColor: 'white', // Removed to let Input handle theme
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 4,
    marginTop: 4,
  },
  picker: {
    height: Platform.OS === 'web' ? 40 : 50,
    backgroundColor: 'transparent',
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
    alignItems: 'flex-start',
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
  warehouseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
