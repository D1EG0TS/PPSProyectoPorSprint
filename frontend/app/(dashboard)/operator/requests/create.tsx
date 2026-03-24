import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Card, Button, SegmentedButtons, Chip, IconButton, TextInput, HelperText, Menu, Divider } from 'react-native-paper';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { ScreenContainer } from '../../../../components/ScreenContainer';
import { ProductSearch } from '../../../../components/products/ProductSearch';
import { Input } from '../../../../components/Input';
import { LocationPicker } from '../../../../components/locations/LocationPicker';
import { warehouseService, Warehouse, Location } from '../../../../services/warehouseService';
import { createMovementRequest, submitMovementRequest, MovementType, MovementPriority } from '../../../../services/movementService';
import { Product } from '../../../../services/productService';

const ADJUSTMENT_REASONS = [
  { value: 'SHRINKAGE', label: 'Merma' },
  { value: 'DAMAGE', label: 'Daño' },
  { value: 'EXPIRY', label: 'Vencimiento' },
  { value: 'SURPLUS', label: 'Sobrante' },
  { value: 'CORRECTION', label: 'Corrección de inventario' },
  { value: 'OTHER', label: 'Otro' },
];

const ENTRY_REASONS = [
  { value: 'PURCHASE', label: 'Compra' },
  { value: 'RETURN', label: 'Devolución' },
  { value: 'TRANSFER_IN', label: 'Transferencia entrada' },
  { value: 'PRODUCTION', label: 'Producción' },
  { value: 'OTHER', label: 'Otro' },
];

const EXIT_REASONS = [
  { value: 'SALE', label: 'Venta' },
  { value: 'PROJECT_USE', label: 'Uso en proyecto' },
  { value: 'TRANSFER_OUT', label: 'Transferencia salida' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'SAMPLE', label: 'Muestra' },
  { value: 'OTHER', label: 'Otro' },
];

const requestSchema = z.object({
  type: z.nativeEnum(MovementType),
  destination_warehouse_id: z.number().optional(),
  source_warehouse_id: z.number().optional(),
  reason: z.string().min(1, 'El motivo es requerido'),
  reference: z.string().optional(),
  adjustment_reason: z.string().optional(),
  justification: z.string().optional(),
  project_name: z.string().optional(),
  project_code: z.string().optional(),
  items: z.array(z.object({
    product_id: z.number(),
    product_name: z.string().optional(),
    sku: z.string().optional(),
    quantity: z.number().min(1, 'La cantidad debe ser mayor a 0'),
    notes: z.string().optional(),
    source_location_id: z.number().optional(),
    destination_location_id: z.number().optional(),
    lot_number: z.string().optional(),
    container_code: z.string().optional(),
    current_quantity: z.number().optional(),
    adjustment_quantity: z.number().optional(),
  })).min(1, 'Debe agregar al menos un producto'),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function CreateRequestScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showDestMenu, setShowDestMenu] = useState(false);
  
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'source' | 'destination'>('destination');
  const [pickerItemIndex, setPickerItemIndex] = useState(0);
  const [pickerWarehouseId, setPickerWarehouseId] = useState<number>(0);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: MovementType.IN,
      items: [],
      reason: '',
      reference: '',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchType = watch('type');
  const watchSource = watch('source_warehouse_id');
  const watchDest = watch('destination_warehouse_id');

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0) {
        setValue('destination_warehouse_id', data[0].id);
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error cargando almacenes' });
    }
  };

  const handleProductSelect = (product: Product) => {
    const exists = fields.some(item => item.product_id === product.id);
    if (exists) {
      Toast.show({ type: 'info', text1: 'El producto ya está en la lista' });
      return;
    }

    append({
      product_id: product.id,
      quantity: 1,
      notes: '',
      product_name: product.name,
      sku: product.sku,
    });
  };

  const openLocationPicker = (mode: 'source' | 'destination', itemIndex: number) => {
    const warehouseId = mode === 'source' ? watchSource : watchDest;
    if (!warehouseId) {
      Toast.show({ type: 'warning', text1: 'Selecciona un almacén primero' });
      return;
    }
    setPickerMode(mode);
    setPickerItemIndex(itemIndex);
    setPickerWarehouseId(warehouseId);
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (location: Location) => {
    if (pickerMode === 'source') {
      setValue(`items.${pickerItemIndex}.source_location_id`, location.id);
    } else {
      setValue(`items.${pickerItemIndex}.destination_location_id`, location.id);
    }
    setShowLocationPicker(false);
  };

  const getLocationName = (locationId?: number) => {
    if (!locationId) return 'Seleccionar ubicación';
    return 'Ubicación seleccionada';
  };

  const getReasons = () => {
    switch (watchType) {
      case MovementType.IN: return ENTRY_REASONS;
      case MovementType.OUT: return EXIT_REASONS;
      case MovementType.ADJUSTMENT: return ADJUSTMENT_REASONS;
      default: return [];
    }
  };

  const getTypeColor = () => {
    switch (watchType) {
      case MovementType.IN: return '#4caf50';
      case MovementType.OUT: return '#f44336';
      case MovementType.TRANSFER: return '#2196f3';
      case MovementType.ADJUSTMENT: return '#ff9800';
      default: return theme.colors.primary;
    }
  };

  const getTypeIcon = () => {
    switch (watchType) {
      case MovementType.IN: return 'arrow-down-bold';
      case MovementType.OUT: return 'arrow-up-bold';
      case MovementType.TRANSFER: return 'swap-horizontal';
      case MovementType.ADJUSTMENT: return 'scale-balance';
      default: return 'swap-horizontal';
    }
  };

  const onSubmit = async (data: RequestFormData, shouldSubmit: boolean = false) => {
    setSubmitting(true);
    try {
      const items = data.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes,
        source_location_id: item.source_location_id,
        destination_location_id: item.destination_location_id,
        lot_number: item.lot_number,
        container_code: item.container_code,
      }));

      const requestData: any = {
        type: data.type,
        reason: data.reason,
        reference: data.reference,
        priority: MovementPriority.NORMAL,
        items,
      };

      if (watchType === MovementType.IN || watchType === MovementType.TRANSFER) {
        requestData.destination_warehouse_id = data.destination_warehouse_id;
      }
      if (watchType === MovementType.OUT || watchType === MovementType.TRANSFER) {
        requestData.source_warehouse_id = data.source_warehouse_id;
      }
      if (watchType === MovementType.OUT || watchType === MovementType.TRANSFER) {
        requestData.project_name = data.project_name;
        requestData.project_code = data.project_code;
      }
      if (watchType === MovementType.ADJUSTMENT) {
        requestData.adjustment_reason = data.adjustment_reason;
        requestData.justification = data.justification;
      }

      const created = await createMovementRequest(requestData);

      if (shouldSubmit) {
        await submitMovementRequest(created.id);
        Toast.show({ type: 'success', text1: 'Solicitud enviada correctamente' });
      } else {
        Toast.show({ type: 'success', text1: 'Borrador guardado' });
      }
      
      router.back();

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Error al guardar la solicitud';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const renderTypeSelector = () => (
    <View style={styles.typeSelector}>
      <SegmentedButtons
        value={watchType}
        onValueChange={(v) => setValue('type', v as MovementType)}
        buttons={[
          { 
            value: MovementType.IN, 
            icon: 'arrow-down-bold', 
            label: 'Entrada',
            style: watchType === MovementType.IN ? { backgroundColor: '#e8f5e9' } : undefined,
          },
          { 
            value: MovementType.OUT, 
            icon: 'arrow-up-bold', 
            label: 'Salida',
            style: watchType === MovementType.OUT ? { backgroundColor: '#ffebee' } : undefined,
          },
          { 
            value: MovementType.TRANSFER, 
            icon: 'swap-horizontal', 
            label: 'Transferencia',
            style: watchType === MovementType.TRANSFER ? { backgroundColor: '#e3f2fd' } : undefined,
          },
          { 
            value: MovementType.ADJUSTMENT, 
            icon: 'scale-balance', 
            label: 'Ajuste',
            style: watchType === MovementType.ADJUSTMENT ? { backgroundColor: '#fff3e0' } : undefined,
          },
        ]}
      />
    </View>
  );

  const renderWarehouseSelector = () => (
    <>
      {(watchType === MovementType.IN || watchType === MovementType.TRANSFER) && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Almacén Destino *</Text>
          <Menu
            visible={showDestMenu}
            onDismiss={() => setShowDestMenu(false)}
            anchor={
              <Button 
                mode="outlined" 
                onPress={() => setShowDestMenu(true)}
                icon="warehouse"
                style={{ borderColor: errors.destination_warehouse_id ? theme.colors.error : undefined }}
              >
                {warehouses.find(w => w.id === watchDest)?.name || 'Seleccionar'}
              </Button>
            }
          >
            {warehouses.map(w => (
              <Menu.Item 
                key={w.id} 
                onPress={() => { 
                  setValue('destination_warehouse_id', w.id); 
                  setShowDestMenu(false); 
                }} 
                title={w.name} 
              />
            ))}
          </Menu>
        </View>
      )}

      {(watchType === MovementType.OUT || watchType === MovementType.TRANSFER) && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Almacén Origen *</Text>
          <Menu
            visible={showSourceMenu}
            onDismiss={() => setShowSourceMenu(false)}
            anchor={
              <Button 
                mode="outlined" 
                onPress={() => setShowSourceMenu(true)}
                icon="warehouse"
                style={{ borderColor: errors.source_warehouse_id ? theme.colors.error : undefined }}
              >
                {warehouses.find(w => w.id === watchSource)?.name || 'Seleccionar'}
              </Button>
            }
          >
            {warehouses.map(w => (
              <Menu.Item 
                key={w.id} 
                onPress={() => { 
                  setValue('source_warehouse_id', w.id); 
                  setShowSourceMenu(false); 
                }} 
                title={w.name} 
              />
            ))}
          </Menu>
        </View>
      )}
    </>
  );

  const renderReasonSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Motivo *</Text>
      <View style={styles.chipContainer}>
        {getReasons().map(reason => (
          <Chip
            key={reason.value}
            selected={watch('reason') === reason.value}
            onPress={() => setValue('reason', reason.value)}
            style={styles.chip}
          >
            {reason.label}
          </Chip>
        ))}
      </View>
      {errors.reason && <HelperText type="error">{errors.reason.message}</HelperText>}
    </View>
  );

  const renderProjectFields = () => (
    watchType === MovementType.OUT || watchType === MovementType.TRANSFER ? (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>Proyecto / Obra</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input control={control} name="project_name" label="Nombre del Proyecto" placeholder="Ej. Construcción Edificio A" />
            </View>
            <View style={[styles.flex1, { marginLeft: 8 }]}>
              <Input control={control} name="project_code" label="Código" placeholder="Ej. PROY-2026-001" />
            </View>
          </View>
        </Card.Content>
      </Card>
    ) : null
  );

  const renderAdjustmentFields = () => (
    watchType === MovementType.ADJUSTMENT ? (
      <>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tipo de Ajuste *</Text>
          <View style={styles.chipContainer}>
            {ADJUSTMENT_REASONS.map(reason => (
              <Chip
                key={reason.value}
                selected={watch('adjustment_reason') === reason.value}
                onPress={() => setValue('adjustment_reason', reason.value)}
                style={styles.chip}
              >
                {reason.label}
              </Chip>
            ))}
          </View>
        </View>
        <Input 
          control={control} 
          name="justification" 
          label="Justificación *" 
          placeholder="Describe la razón del ajuste..." 
        />
      </>
    ) : null
  );

  const renderProductItem = (item: any, index: number) => {
    const isOutOrTransfer = watchType === MovementType.OUT || watchType === MovementType.TRANSFER;
    const isInOrTransfer = watchType === MovementType.IN || watchType === MovementType.TRANSFER;
    const isAdjustment = watchType === MovementType.ADJUSTMENT;

    return (
      <Card key={item.id} style={[styles.itemCard, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product_name || `Producto #${item.product_id}`}</Text>
              <Text style={styles.itemSku}>{item.sku}</Text>
            </View>
            <IconButton icon="delete" iconColor={theme.colors.error} onPress={() => remove(index)} />
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Cantidad {isAdjustment ? 'Nueva' : ''}</Text>
              <Controller
                control={control}
                name={`items.${index}.quantity`}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    keyboardType="numeric"
                    value={String(value)}
                    onChangeText={text => onChange(Number(text) || 0)}
                    style={{ backgroundColor: theme.colors.surface }}
                    mode="outlined"
                    dense
                  />
                )}
              />
            </View>

            {isAdjustment && (
              <View style={[styles.flex1, { marginLeft: 8 }]}>
                <Text style={styles.label}>Diferencia (+/-)</Text>
                <Controller
                  control={control}
                  name={`items.${index}.adjustment_quantity`}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      keyboardType="numeric"
                      value={String(value || '')}
                      onChangeText={text => onChange(Number(text) || 0)}
                      placeholder="+5 o -3"
                      style={{ backgroundColor: theme.colors.surface }}
                      mode="outlined"
                      dense
                    />
                  )}
                />
              </View>
            )}
          </View>

          {isOutOrTransfer && (
            <View style={styles.locationSection}>
              <Text style={styles.label}>Ubicación de Origen</Text>
              <Button
                mode="outlined"
                icon="map-marker"
                onPress={() => openLocationPicker('source', index)}
                style={styles.locationButton}
              >
                {getLocationName(item.source_location_id)}
              </Button>
            </View>
          )}

          {isInOrTransfer && (
            <View style={styles.locationSection}>
              <Text style={styles.label}>Ubicación de Destino</Text>
              <Button
                mode="outlined"
                icon="map-marker-check"
                onPress={() => openLocationPicker('destination', index)}
                style={styles.locationButton}
              >
                {getLocationName(item.destination_location_id)}
              </Button>
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Lote</Text>
              <Controller
                control={control}
                name={`items.${index}.lot_number`}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Opcional"
                    style={{ backgroundColor: theme.colors.surface }}
                    mode="outlined"
                    dense
                  />
                )}
              />
            </View>
            <View style={[styles.flex1, { marginLeft: 8 }]}>
              <Text style={styles.label}>Contenedor</Text>
              <Controller
                control={control}
                name={`items.${index}.container_code`}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Ej. C-001"
                    style={{ backgroundColor: theme.colors.surface }}
                    mode="outlined"
                    dense
                  />
                )}
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Nueva Solicitud de Movimiento
        </Text>

        {renderTypeSelector()}

        <Card style={styles.card}>
          <Card.Content>
            {renderWarehouseSelector()}
            {renderReasonSelector()}
            {renderAdjustmentFields()}
            <Input control={control} name="reference" label="Referencia (Opcional)" placeholder="Ej. PO-123" />
          </Card.Content>
        </Card>

        {renderProjectFields()}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Productos</Text>
            
            <View style={{ marginBottom: 16 }}>
              <ProductSearch onSelect={handleProductSelect} />
            </View>

            {fields.map((item, index) => renderProductItem(item, index))}
            
            {errors.items && <HelperText type="error">{errors.items.message}</HelperText>}
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={handleSubmit((data) => onSubmit(data, false))} 
            loading={submitting} 
            style={styles.button}
          >
            Guardar Borrador
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSubmit((data) => onSubmit(data, true))} 
            loading={submitting} 
            style={styles.button}
          >
            Enviar Solicitud
          </Button>
        </View>
      </ScrollView>

      <LocationPicker
        visible={showLocationPicker}
        onDismiss={() => setShowLocationPicker(false)}
        onSelect={handleLocationSelect}
        warehouseId={pickerWarehouseId}
        title={pickerMode === 'source' ? 'Seleccionar Ubicación de Origen' : 'Seleccionar Ubicación de Destino'}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  typeSelector: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '600',
    fontSize: 16,
  },
  itemSku: {
    fontSize: 12,
    color: '#666',
  },
  locationSection: {
    marginBottom: 12,
  },
  locationButton: {
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});
