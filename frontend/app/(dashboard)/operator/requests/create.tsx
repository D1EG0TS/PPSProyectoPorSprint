import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button as PaperButton, Card, IconButton, HelperText, Divider, Menu, TextInput } from 'react-native-paper';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { Colors } from '../../../../constants/Colors';
import { ProductSearch } from '../../../../components/products/ProductSearch';
import { Input } from '../../../../components/Input';
import { warehouseService, Warehouse } from '../../../../services/warehouseService';
import { createMovementRequest, submitMovementRequest, MovementType, MovementStatus } from '../../../../services/movementService';
import { Product } from '../../../../services/productService';

// Schema Validation
const requestSchema = z.object({
  type: z.nativeEnum(MovementType),
  source_warehouse_id: z.number().optional(),
  destination_warehouse_id: z.number().optional(),
  reason: z.string().min(1, "El motivo es obligatorio"),
  reference: z.string().optional(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
    notes: z.string().optional(),
    product_name: z.string().optional(), // Helper for UI
    sku: z.string().optional(), // Helper for UI
  })).min(1, "Debe agregar al menos un producto"),
}).refine((data) => {
  if ((data.type === MovementType.OUT || data.type === MovementType.TRANSFER) && !data.source_warehouse_id) {
    return false;
  }
  return true;
}, {
  message: "El almacén de origen es requerido para salidas y transferencias",
  path: ["source_warehouse_id"],
}).refine((data) => {
  if ((data.type === MovementType.IN || data.type === MovementType.TRANSFER) && !data.destination_warehouse_id) {
    return false;
  }
  return true;
}, {
  message: "El almacén de destino es requerido para entradas y transferencias",
  path: ["destination_warehouse_id"],
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function CreateRequestScreen() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showDestMenu, setShowDestMenu] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: MovementType.IN,
      items: [],
      reason: '',
      reference: '',
    }
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "items"
  });

  const watchType = watch("type");
  const watchSource = watch("source_warehouse_id");
  const watchDest = watch("destination_warehouse_id");

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error cargando almacenes' });
    }
  };

  const handleProductSelect = (product: Product) => {
    // Check if already exists
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
      sku: product.sku
    });
  };

  const onSubmit = async (data: RequestFormData, shouldSubmit: boolean = false) => {
    setSubmitting(true);
    try {
        console.log("Creating request...", data);
        // Create Draft
        const created = await createMovementRequest({
            type: data.type,
            source_warehouse_id: data.source_warehouse_id,
            destination_warehouse_id: data.destination_warehouse_id,
            reason: data.reason,
            reference: data.reference,
            items: data.items.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                notes: item.notes
            }))
        });

        if (shouldSubmit) {
            console.log("Submitting request...", created.id);
            await submitMovementRequest(created.id);
            Toast.show({ type: 'success', text1: 'Solicitud enviada correctamente' });
        } else {
            Toast.show({ type: 'success', text1: 'Borrador guardado correctamente' });
        }
        
        // Go back or to detail
        // router.push(`/operator/requests/${created.id}`); // Assuming this route exists later
        router.back();

    } catch (error: any) {
        console.error(error);
        const msg = error.response?.data?.detail || "Error al guardar la solicitud";
        Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
        setSubmitting(false);
    }
  };

  const getSourceWarehouseName = () => {
    if (!watchSource) return "Seleccionar Origen";
    return warehouses.find(w => w.id === watchSource)?.name || "Desconocido";
  };

  const getDestWarehouseName = () => {
    if (!watchDest) return "Seleccionar Destino";
    return warehouses.find(w => w.id === watchDest)?.name || "Desconocido";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.title}>Nueva Solicitud</Text>

      {/* General Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>Información General</Text>
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Tipo de Movimiento</Text>
                <Menu
                    visible={showTypeMenu}
                    onDismiss={() => setShowTypeMenu(false)}
                    anchor={
                    <PaperButton mode="outlined" onPress={() => setShowTypeMenu(true)}>
                        {watchType}
                    </PaperButton>
                    }
                >
                    {Object.values(MovementType).map(t => (
                        <Menu.Item key={t} onPress={() => { setValue("type", t); setShowTypeMenu(false); }} title={t} />
                    ))}
                </Menu>
            </View>
          </View>

          {/* Warehouses based on Type */}
          {(watchType === MovementType.OUT || watchType === MovementType.TRANSFER || watchType === MovementType.ADJUSTMENT) && (
             <View style={styles.inputContainer}>
                <Text style={styles.label}>Almacén Origen</Text>
                <Menu
                    visible={showSourceMenu}
                    onDismiss={() => setShowSourceMenu(false)}
                    anchor={
                    <PaperButton mode="outlined" onPress={() => setShowSourceMenu(true)} borderColor={errors.source_warehouse_id ? Colors.error : undefined}>
                        {getSourceWarehouseName()}
                    </PaperButton>
                    }
                >
                    {warehouses.map(w => (
                        <Menu.Item key={w.id} onPress={() => { setValue("source_warehouse_id", w.id); setShowSourceMenu(false); }} title={w.name} />
                    ))}
                </Menu>
                {errors.source_warehouse_id && <HelperText type="error">{errors.source_warehouse_id.message}</HelperText>}
             </View>
          )}

          {(watchType === MovementType.IN || watchType === MovementType.TRANSFER) && (
             <View style={styles.inputContainer}>
                <Text style={styles.label}>Almacén Destino</Text>
                 <Menu
                    visible={showDestMenu}
                    onDismiss={() => setShowDestMenu(false)}
                    anchor={
                    <PaperButton mode="outlined" onPress={() => setShowDestMenu(true)} borderColor={errors.destination_warehouse_id ? Colors.error : undefined}>
                         {getDestWarehouseName()}
                    </PaperButton>
                    }
                >
                    {warehouses.map(w => (
                        <Menu.Item key={w.id} onPress={() => { setValue("destination_warehouse_id", w.id); setShowDestMenu(false); }} title={w.name} />
                    ))}
                </Menu>
                {errors.destination_warehouse_id && <HelperText type="error">{errors.destination_warehouse_id.message}</HelperText>}
             </View>
          )}

          <Input control={control} name="reason" label="Motivo *" placeholder="Ej. Reposición de stock" />
          <Input control={control} name="reference" label="Referencia (Opcional)" placeholder="Ej. PO-123" />

        </Card.Content>
      </Card>

      {/* Items Section */}
      <Card style={styles.card}>
        <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Items</Text>
            
            <View style={{ marginBottom: 16 }}>
                <ProductSearch onSelect={handleProductSelect} />
            </View>

            {fields.map((item, index) => (
                <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.product_name}</Text>
                        <Text style={styles.itemSku}>{item.sku}</Text>
                        <Controller
                            control={control}
                            name={`items.${index}.notes`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    placeholder="Notas..."
                                    value={value}
                                    onChangeText={onChange}
                                    style={styles.notesInput}
                                    dense
                                />
                            )}
                        />
                    </View>
                    
                    <View style={styles.qtyContainer}>
                         <Controller
                            control={control}
                            name={`items.${index}.quantity`}
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    keyboardType="numeric"
                                    value={String(value)}
                                    onChangeText={text => onChange(Number(text) || 0)}
                                    style={styles.qtyInput}
                                    dense
                                    mode="outlined"
                                    label="Cant."
                                />
                            )}
                        />
                    </View>

                    <IconButton icon="delete" iconColor={Colors.error} onPress={() => remove(index)} />
                </View>
            ))}
            {errors.items && <HelperText type="error">{errors.items.message}</HelperText>}

        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <PaperButton 
            mode="outlined" 
            onPress={handleSubmit((data) => onSubmit(data, false))} 
            loading={submitting} 
            style={styles.button}
        >
            Guardar Borrador
        </PaperButton>
        <PaperButton 
            mode="contained" 
            onPress={handleSubmit((data) => onSubmit(data, true))} 
            loading={submitting} 
            style={styles.button}
            buttonColor={Colors.primary}
        >
            Enviar Solicitud
        </PaperButton>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  cardTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: '#6b7280',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontWeight: '600',
    fontSize: 16,
  },
  itemSku: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  notesInput: {
    backgroundColor: 'transparent',
    height: 40,
    fontSize: 14,
  },
  qtyContainer: {
    width: 80,
    marginRight: 4,
  },
  qtyInput: {
    backgroundColor: 'white',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 0.48,
  },
});
