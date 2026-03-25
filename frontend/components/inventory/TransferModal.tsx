import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Modal, Portal, Button, TextInput, SegmentedButtons, Surface, IconButton, Divider } from 'react-native-paper';
import { inventoryService, Warehouse, AvailableLocation, ScanResult } from '../../services/inventoryService';
import { Colors } from '../../constants/Colors';

interface TransferModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  product?: ScanResult | null;
  sourceWarehouseId?: number;
}

export function TransferModal({ 
  visible, 
  onDismiss, 
  onSuccess,
  product,
  sourceWarehouseId 
}: TransferModalProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sourceWarehouse, setSourceWarehouse] = useState<number | null>(null);
  const [destWarehouse, setDestWarehouse] = useState<number | null>(null);
  const [sourceLocations, setSourceLocations] = useState<AvailableLocation[]>([]);
  const [destLocations, setDestLocations] = useState<AvailableLocation[]>([]);
  const [selectedSourceLocation, setSelectedSourceLocation] = useState<number | null>(null);
  const [selectedDestLocation, setSelectedDestLocation] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadWarehouses();
    }
  }, [visible]);

  useEffect(() => {
    if (sourceWarehouse) {
      loadSourceLocations(sourceWarehouse);
    }
  }, [sourceWarehouse]);

  useEffect(() => {
    if (destWarehouse) {
      loadDestLocations(destWarehouse);
    }
  }, [destWarehouse]);

  const loadWarehouses = async () => {
    try {
      const data = await inventoryService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0) {
        setSourceWarehouse(sourceWarehouseId || data[0].id);
        if (data.length > 1) {
          setDestWarehouse(sourceWarehouseId === data[0].id ? data[1].id : data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadSourceLocations = async (whId: number) => {
    try {
      const data = await inventoryService.getAvailableLocations(whId);
      setSourceLocations(data);
    } catch (error) {
      console.error('Error loading source locations:', error);
    }
  };

  const loadDestLocations = async (whId: number) => {
    try {
      const data = await inventoryService.getAvailableLocations(whId);
      setDestLocations(data);
    } catch (error) {
      console.error('Error loading destination locations:', error);
    }
  };

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    if (!sourceWarehouse || !destWarehouse) {
      Alert.alert('Error', 'Selecciona almacén de origen y destino');
      return;
    }

    if (sourceWarehouse === destWarehouse && !selectedSourceLocation && !selectedDestLocation) {
      Alert.alert('Error', 'Selecciona ubicaciones si transfieres dentro del mismo almacén');
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.transfer({
        source_warehouse_id: sourceWarehouse,
        destination_warehouse_id: destWarehouse,
        items: [{
          product_id: product?.product_id!,
          quantity: qty,
          source_location_id: selectedSourceLocation || undefined,
          destination_location_id: selectedDestLocation || undefined,
        }],
        notes: notes || undefined,
      });

      Alert.alert('Éxito', 'Transferencia realizada exitosamente');
      onSuccess();
      handleReset();
    } catch (error: any) {
      console.error('Error submitting transfer:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Error al realizar la transferencia');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setQuantity('');
    setNotes('');
    setSelectedSourceLocation(null);
    setSelectedDestLocation(null);
  };

  const handleDismiss = () => {
    handleReset();
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.container}
      >
        <Surface style={styles.content} elevation={2}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>Transferir Producto</Text>
            <IconButton icon="close" onPress={handleDismiss} />
          </View>

          <Divider />

          <ScrollView style={styles.body}>
            {product && (
              <Surface style={styles.productCard} elevation={0}>
                <View style={styles.productInfo}>
                  <IconButton icon="package-variant" size={28} iconColor={Colors.primary} />
                  <View>
                    <Text variant="titleMedium" style={styles.productName}>{product.name}</Text>
                    <Text variant="bodySmall" style={styles.productSku}>SKU: {product.sku} | Stock: {product.current_stock}</Text>
                  </View>
                </View>
              </Surface>
            )}

            <Text variant="labelLarge" style={styles.sectionTitle}>Almacén de Origen</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.warehouseScroll}>
              {warehouses.map((wh) => (
                <Button
                  key={wh.id}
                  mode={sourceWarehouse === wh.id ? 'contained' : 'outlined'}
                  onPress={() => setSourceWarehouse(wh.id)}
                  style={styles.warehouseChip}
                  compact
                  disabled={wh.id === destWarehouse}
                >
                  {wh.name}
                </Button>
              ))}
            </ScrollView>

            {sourceLocations.length > 0 && (
              <>
                <Text variant="labelMedium" style={styles.subSectionTitle}>Ubicación de Origen (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.warehouseScroll}>
                  <Button
                    mode={selectedSourceLocation === null ? 'contained' : 'outlined'}
                    onPress={() => setSelectedSourceLocation(null)}
                    style={styles.warehouseChip}
                    compact
                  >
                    Cualquiera
                  </Button>
                  {sourceLocations.map((loc) => (
                    <Button
                      key={loc.id}
                      mode={selectedSourceLocation === loc.id ? 'contained' : 'outlined'}
                      onPress={() => setSelectedSourceLocation(loc.id)}
                      style={styles.warehouseChip}
                      compact
                    >
                      {loc.code}
                    </Button>
                  ))}
                </ScrollView>
              </>
            )}

            <IconButton icon="arrow-down" size={24} style={styles.arrowIcon} />

            <Text variant="labelLarge" style={styles.sectionTitle}>Almacén de Destino</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.warehouseScroll}>
              {warehouses.map((wh) => (
                <Button
                  key={wh.id}
                  mode={destWarehouse === wh.id ? 'contained' : 'outlined'}
                  onPress={() => setDestWarehouse(wh.id)}
                  style={styles.warehouseChip}
                  compact
                  disabled={wh.id === sourceWarehouse}
                >
                  {wh.name}
                </Button>
              ))}
            </ScrollView>

            {destLocations.length > 0 && (
              <>
                <Text variant="labelMedium" style={styles.subSectionTitle}>Ubicación de Destino (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.warehouseScroll}>
                  <Button
                    mode={selectedDestLocation === null ? 'contained' : 'outlined'}
                    onPress={() => setSelectedDestLocation(null)}
                    style={styles.warehouseChip}
                    compact
                  >
                    Cualquiera
                  </Button>
                  {destLocations.map((loc) => (
                    <Button
                      key={loc.id}
                      mode={selectedDestLocation === loc.id ? 'contained' : 'outlined'}
                      onPress={() => setSelectedDestLocation(loc.id)}
                      style={styles.warehouseChip}
                      compact
                    >
                      {loc.code}
                    </Button>
                  ))}
                </ScrollView>
              </>
            )}

            <TextInput
              label="Cantidad a transferir"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />
          </ScrollView>

          <Divider />

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleDismiss}
              style={styles.actionButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting || !quantity || !sourceWarehouse || !destWarehouse}
              style={styles.actionButton}
            >
              Transferir
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    maxHeight: '90%',
  },
  content: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  body: {
    padding: 16,
    maxHeight: 500,
  },
  productCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productName: {
    fontWeight: '600',
    color: Colors.text,
  },
  productSku: {
    color: Colors.textSecondary,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    color: Colors.text,
  },
  subSectionTitle: {
    marginTop: 4,
    marginBottom: 4,
    color: Colors.textSecondary,
  },
  warehouseScroll: {
    marginBottom: 12,
  },
  warehouseChip: {
    marginRight: 8,
  },
  arrowIcon: {
    alignSelf: 'center',
    marginVertical: 8,
  },
  input: {
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
