import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, TextInput, Divider, IconButton, Surface, Chip, ActivityIndicator } from 'react-native-paper';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { BarcodeScanner } from '../../../../components/inventory/BarcodeScanner';
import { TransferModal } from '../../../../components/inventory/TransferModal';
import { inventoryService, ScanResult, Warehouse } from '../../../../services/inventoryService';
import { Colors } from '../../../../constants/Colors';

export default function TransferScreen() {
  const [scannedProduct, setScannedProduct] = useState<ScanResult | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sourceWarehouse, setSourceWarehouse] = useState<number | null>(null);
  const [destWarehouse, setDestWarehouse] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferItems, setTransferItems] = useState<Array<{ product: ScanResult; quantity: number }>>([]);

  const loadWarehouses = async () => {
    try {
      const data = await inventoryService.getWarehouses();
      setWarehouses(data);
      if (data.length >= 2) {
        setSourceWarehouse(data[0].id);
        setDestWarehouse(data[1].id);
      } else if (data.length === 1) {
        setSourceWarehouse(data[0].id);
        setDestWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleScan = async (code: string) => {
    setLoading(true);
    try {
      const result = await inventoryService.scan(code, sourceWarehouse || undefined);
      if (result.found) {
        setScannedProduct(result);
        setQuantity('');
      } else {
        Alert.alert('No encontrado', `No se encontró producto con código: ${code}`);
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Error al escanear el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleClearScan = () => {
    setScannedProduct(null);
    setQuantity('');
  };

  const handleAddToTransfer = () => {
    if (!scannedProduct) return;
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }
    
    if (qty > scannedProduct.current_stock) {
      Alert.alert('Error', `Stock insuficiente. Disponible: ${scannedProduct.current_stock}`);
      return;
    }

    const existingIndex = transferItems.findIndex(
      item => item.product.product_id === scannedProduct.product_id
    );

    if (existingIndex >= 0) {
      const updated = [...transferItems];
      updated[existingIndex].quantity += qty;
      setTransferItems(updated);
    } else {
      setTransferItems([...transferItems, { product: scannedProduct, quantity: qty }]);
    }

    setScannedProduct(null);
    setQuantity('');
  };

  const handleRemoveItem = (productId: number) => {
    setTransferItems(transferItems.filter(item => item.product.product_id !== productId));
  };

  const handleTransfer = async () => {
    if (transferItems.length === 0) {
      Alert.alert('Error', 'Agrega productos a transferir');
      return;
    }

    if (!sourceWarehouse || !destWarehouse) {
      Alert.alert('Error', 'Selecciona almacén de origen y destino');
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.transfer({
        source_warehouse_id: sourceWarehouse,
        destination_warehouse_id: destWarehouse,
        items: transferItems.map(item => ({
          product_id: item.product.product_id!,
          quantity: item.quantity,
        })),
        notes: notes || undefined,
      });

      Alert.alert('Éxito', 'Transferencia realizada exitosamente');
      setTransferItems([]);
      setNotes('');
      if (warehouses.length >= 2) {
        setSourceWarehouse(warehouses[0].id);
        setDestWarehouse(warehouses[1].id);
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Error al realizar la transferencia');
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = transferItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Transferencia de Inventario</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Card.Title title="Almacenes" />
          <Card.Content>
            <View style={styles.warehouseRow}>
              <View style={styles.warehouseColumn}>
                <Text variant="labelMedium" style={styles.label}>Origen</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {warehouses.map((wh) => (
                    <Chip
                      key={wh.id}
                      selected={sourceWarehouse === wh.id}
                      onPress={() => setSourceWarehouse(wh.id)}
                      style={styles.chip}
                      disabled={wh.id === destWarehouse}
                    >
                      {wh.name}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
              <IconButton icon="arrow-right" size={24} />
              <View style={styles.warehouseColumn}>
                <Text variant="labelMedium" style={styles.label}>Destino</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {warehouses.map((wh) => (
                    <Chip
                      key={wh.id}
                      selected={destWarehouse === wh.id}
                      onPress={() => setDestWarehouse(wh.id)}
                      style={styles.chip}
                      disabled={wh.id === sourceWarehouse}
                    >
                      {wh.name}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Escanear Producto" />
          <Card.Content>
            <BarcodeScanner
              onScan={handleScan}
              onClear={handleClearScan}
              disabled={loading}
            />
            
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.loadingText}>Buscando producto...</Text>
              </View>
            )}

            {scannedProduct && (
              <Surface style={styles.productCard} elevation={1}>
                <View style={styles.productInfo}>
                  <View style={styles.productDetails}>
                    <Text variant="titleMedium" style={styles.productName}>
                      {scannedProduct.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.productSku}>
                      SKU: {scannedProduct.sku} | Stock: {scannedProduct.current_stock}
                    </Text>
                  </View>
                  <IconButton icon="check-circle" iconColor={Colors.success} size={24} />
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.quantityRow}>
                  <TextInput
                    label="Cantidad"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.quantityInput}
                  />
                  <Button
                    mode="contained"
                    onPress={handleAddToTransfer}
                    style={styles.addButton}
                  >
                    Agregar
                  </Button>
                </View>
              </Surface>
            )}
          </Card.Content>
        </Card>

        {transferItems.length > 0 && (
          <Card style={styles.card}>
            <Card.Title 
              title={`Productos a Transferir (${transferItems.length})`} 
              subtitle={`Total: ${totalItems} unidades`}
            />
            <Card.Content>
              {transferItems.map((item) => (
                <Surface key={item.product.product_id} style={styles.transferItem} elevation={0}>
                  <View style={styles.transferItemInfo}>
                    <Text variant="bodyMedium" style={styles.transferItemName}>
                      {item.product.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.transferItemQty}>
                      {item.quantity} unidades
                    </Text>
                  </View>
                  <IconButton
                    icon="delete"
                    iconColor={Colors.danger}
                    size={20}
                    onPress={() => handleRemoveItem(item.product.product_id!)}
                  />
                </Surface>
              ))}
              
              <TextInput
                label="Notas (opcional)"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.notesInput}
              />
            </Card.Content>
            <Card.Actions>
              <Button mode="outlined" onPress={() => setTransferItems([])}>
                Limpiar
              </Button>
              <Button
                mode="contained"
                onPress={handleTransfer}
                loading={submitting}
                disabled={submitting}
              >
                Transferir
              </Button>
            </Card.Actions>
          </Card>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  card: {
    marginBottom: 16,
  },
  warehouseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warehouseColumn: {
    flex: 1,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: Colors.textSecondary,
  },
  productCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    color: Colors.text,
  },
  productSku: {
    color: Colors.textSecondary,
  },
  divider: {
    marginVertical: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityInput: {
    flex: 1,
  },
  addButton: {
    marginTop: 6,
  },
  transferItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  transferItemInfo: {
    flex: 1,
  },
  transferItemName: {
    fontWeight: '500',
    color: Colors.text,
  },
  transferItemQty: {
    color: Colors.textSecondary,
  },
  notesInput: {
    marginTop: 12,
  },
});
