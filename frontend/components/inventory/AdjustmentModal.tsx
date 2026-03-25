import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Modal, Portal, Button, TextInput, SegmentedButtons, Surface, IconButton, Divider } from 'react-native-paper';
import { inventoryService, AdjustmentItem, AdjustmentReason, Warehouse, ProductLocationInfo } from '../../services/inventoryService';
import { Colors } from '../../constants/Colors';

interface AdjustmentModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  product: {
    id: number;
    name: string;
    sku: string;
    current_stock: number;
  };
  warehouseId?: number;
}

const ADJUSTMENT_REASONS = [
  { value: 'RECOUNT', label: 'Conteo', icon: 'clipboard-check' },
  { value: 'DAMAGE', label: 'Dañado', icon: 'alert' },
  { value: 'THEFT', label: 'Robo', icon: 'shield-off' },
  { value: 'EXPIRED', label: 'Vencido', icon: 'clock-alert' },
  { value: 'CORRECTION', label: 'Corrección', icon: 'pencil' },
  { value: 'OTHER', label: 'Otro', icon: 'dots-horizontal' },
];

export function AdjustmentModal({ 
  visible, 
  onDismiss, 
  onSuccess, 
  product,
  warehouseId 
}: AdjustmentModalProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [locations, setLocations] = useState<ProductLocationInfo[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [quantityChange, setQuantityChange] = useState('');
  const [isIncrease, setIsIncrease] = useState(true);
  const [reason, setReason] = useState<AdjustmentReason>('CORRECTION');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadWarehouses();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedWarehouse) {
      loadLocations(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const loadWarehouses = async () => {
    try {
      const data = await inventoryService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0) {
        setSelectedWarehouse(warehouseId || data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadLocations = async (whId: number) => {
    try {
      const data = await inventoryService.getProductLocations(product.id, whId);
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleSubmit = async () => {
    const change = parseInt(quantityChange);
    if (isNaN(change) || change <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    if (!selectedWarehouse) {
      Alert.alert('Error', 'Selecciona un almacén');
      return;
    }

    setSubmitting(true);
    try {
      const adjustmentItem: AdjustmentItem = {
        product_id: product.id,
        warehouse_id: selectedWarehouse,
        location_id: selectedLocation || undefined,
        quantity: isIncrease ? change : -change,
        reason: reason,
        notes: notes || undefined,
      };

      await inventoryService.adjust({
        items: [adjustmentItem],
        reference: `Ajuste ${reason}`
      });

      Alert.alert('Éxito', 'Ajuste de inventario realizado exitosamente');
      onSuccess();
      handleReset();
    } catch (error: any) {
      console.error('Error submitting adjustment:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Error al realizar el ajuste');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setQuantityChange('');
    setIsIncrease(true);
    setReason('CORRECTION');
    setNotes('');
    setSelectedLocation(null);
  };

  const handleDismiss = () => {
    handleReset();
    onDismiss();
  };

  const newStock = product.current_stock + (parseInt(quantityChange) || 0) * (isIncrease ? 1 : -1);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.container}
      >
        <Surface style={styles.content} elevation={2}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>Ajuste de Inventario</Text>
            <IconButton icon="close" onPress={handleDismiss} />
          </View>

          <Divider />

          <ScrollView style={styles.body}>
            <Surface style={styles.productCard} elevation={0}>
              <View style={styles.productInfo}>
                <IconButton icon="package-variant" size={28} iconColor={Colors.primary} />
                <View>
                  <Text variant="titleMedium" style={styles.productName}>{product.name}</Text>
                  <Text variant="bodySmall" style={styles.productSku}>SKU: {product.sku}</Text>
                </View>
              </View>
              <View style={styles.stockInfo}>
                <View style={styles.stockItem}>
                  <Text variant="labelSmall" style={styles.stockLabel}>Stock actual</Text>
                  <Text variant="headlineSmall" style={styles.stockValue}>{product.current_stock}</Text>
                </View>
                <IconButton icon="arrow-right" size={20} />
                <View style={styles.stockItem}>
                  <Text variant="labelSmall" style={styles.stockLabel}>Nuevo stock</Text>
                  <Text 
                    variant="headlineSmall" 
                    style={[
                      styles.stockValue,
                      { color: newStock < 0 ? Colors.danger : newStock !== product.current_stock ? Colors.success : Colors.text }
                    ]}
                  >
                    {newStock}
                  </Text>
                </View>
              </View>
            </Surface>

            <Text variant="labelLarge" style={styles.sectionTitle}>Tipo de ajuste</Text>
            <SegmentedButtons
              value={isIncrease ? 'increase' : 'decrease'}
              onValueChange={(value) => setIsIncrease(value === 'increase')}
              buttons={[
                { value: 'increase', label: 'Aumentar (+)', icon: 'plus' },
                { value: 'decrease', label: 'Disminuir (-)', icon: 'minus' },
              ]}
              style={styles.segmented}
            />

            <TextInput
              label="Cantidad"
              value={quantityChange}
              onChangeText={setQuantityChange}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <Text variant="labelLarge" style={styles.sectionTitle}>Razón del ajuste</Text>
            <View style={styles.reasonsGrid}>
              {ADJUSTMENT_REASONS.map((r) => (
                <Surface 
                  key={r.value} 
                  style={[
                    styles.reasonCard,
                    reason === r.value && styles.reasonCardSelected
                  ]} 
                  elevation={1}
                >
                  <IconButton
                    icon={r.icon}
                    size={24}
                    iconColor={reason === r.value ? Colors.white : Colors.textSecondary}
                    onPress={() => setReason(r.value as AdjustmentReason)}
                  />
                  <Text 
                    variant="bodySmall" 
                    style={[
                      styles.reasonLabel,
                      reason === r.value && styles.reasonLabelSelected
                    ]}
                    onPress={() => setReason(r.value as AdjustmentReason)}
                  >
                    {r.label}
                  </Text>
                </Surface>
              ))}
            </View>

            <Text variant="labelLarge" style={styles.sectionTitle}>Almacén</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.warehouseScroll}>
              {warehouses.map((wh) => (
                <Button
                  key={wh.id}
                  mode={selectedWarehouse === wh.id ? 'contained' : 'outlined'}
                  onPress={() => setSelectedWarehouse(wh.id)}
                  style={styles.warehouseChip}
                  compact
                >
                  {wh.name}
                </Button>
              ))}
            </ScrollView>

            {locations.length > 0 && (
              <>
                <Text variant="labelLarge" style={styles.sectionTitle}>Ubicación (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.warehouseScroll}>
                  <Button
                    mode={selectedLocation === null ? 'contained' : 'outlined'}
                    onPress={() => setSelectedLocation(null)}
                    style={styles.warehouseChip}
                    compact
                  >
                    Todas
                  </Button>
                  {locations.map((loc) => (
                    <Button
                      key={loc.location_id}
                      mode={selectedLocation === loc.location_id ? 'contained' : 'outlined'}
                      onPress={() => setSelectedLocation(loc.location_id)}
                      style={styles.warehouseChip}
                      compact
                    >
                      {loc.location_code} ({loc.quantity})
                    </Button>
                  ))}
                </ScrollView>
              </>
            )}

            <TextInput
              label="Notas adicionales (opcional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
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
              disabled={submitting || !quantityChange}
              style={styles.actionButton}
            >
              Confirmar ajuste
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
    marginBottom: 12,
  },
  productName: {
    fontWeight: '600',
    color: Colors.text,
  },
  productSku: {
    color: Colors.textSecondary,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockItem: {
    alignItems: 'center',
  },
  stockLabel: {
    color: Colors.textSecondary,
  },
  stockValue: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    color: Colors.text,
  },
  segmented: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reasonCard: {
    width: '30%',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  reasonCardSelected: {
    backgroundColor: Colors.primary,
  },
  reasonLabel: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  reasonLabelSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  warehouseScroll: {
    marginBottom: 16,
  },
  warehouseChip: {
    marginRight: 8,
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
