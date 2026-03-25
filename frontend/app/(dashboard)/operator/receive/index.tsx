import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, IconButton, Surface, Divider, Chip, ActivityIndicator, List } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { inventoryService, ReceiveItem, ReceiveRequest, Warehouse, AvailableLocation } from '../../../../services/inventoryService';
import { getProducts, getProductById, Product } from '../../../../services/productService';
import { Colors } from '../../../../constants/Colors';

export default function ReceiveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<ReceiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<AvailableLocation[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState('1');
  const [batchNumber, setBatchNumber] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<AvailableLocation | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (params.productId) {
      loadProduct(params.productId as string);
    }
  }, [params.productId]);

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
        setSelectedWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadLocations = async (warehouseId: number) => {
    try {
      const data = await inventoryService.getAvailableLocations(warehouseId);
      setAvailableLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true);
      const product = await getProductById(parseInt(productId));
      setSelectedProduct(product);
      setProducts([product]);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setProducts([]);
      return;
    }
    try {
      const data = await getProducts({ search: query });
      setProducts(data.slice(0, 10));
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  const addItem = () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Selecciona un producto e ingresa una cantidad válida');
      return;
    }

    const newItem: ReceiveItem = {
      product_id: selectedProduct.id,
      quantity: parseInt(quantity),
      batch_number: batchNumber || undefined,
      location_id: selectedLocation?.id,
    };

    setItems([...items, newItem]);
    setSelectedProduct(null);
    setQuantity('1');
    setBatchNumber('');
    setSelectedLocation(null);
    setProductSearch('');
    setProducts([]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!selectedWarehouse) {
      Alert.alert('Error', 'Selecciona un almacén');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Agrega al menos un producto');
      return;
    }

    setSubmitting(true);
    try {
      const request: ReceiveRequest = {
        warehouse_id: selectedWarehouse,
        items: items,
      };

      const result = await inventoryService.receive(request);
      
      Alert.alert('Éxito', result.message, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error receiving:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Error al recibir mercancía');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Almacén</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {warehouses.map((wh) => (
              <Chip
                key={wh.id}
                selected={selectedWarehouse === wh.id}
                onPress={() => setSelectedWarehouse(wh.id)}
                style={styles.warehouseChip}
                icon="warehouse"
              >
                {wh.name}
              </Chip>
            ))}
          </ScrollView>
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Agregar Producto</Text>
          
          {selectedProduct ? (
            <Surface style={styles.selectedProduct} elevation={0}>
              <View style={styles.selectedProductInfo}>
                <IconButton icon="check-circle" iconColor={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">{selectedProduct.name}</Text>
                  <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>
                    SKU: {selectedProduct.sku} | Stock actual: {selectedProduct.total_stock || 0}
                  </Text>
                </View>
                <IconButton icon="close" onPress={() => setSelectedProduct(null)} />
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.inputRow}>
                <TextInput
                  label="Cantidad"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.quantityInput}
                />
                <TextInput
                  label="No. Lote (opcional)"
                  value={batchNumber}
                  onChangeText={setBatchNumber}
                  mode="outlined"
                  style={styles.batchInput}
                />
              </View>

              {availableLocations.length > 0 && (
                <View style={styles.locationSection}>
                  <Text variant="labelMedium" style={styles.label}>Ubicación (opcional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Chip
                      selected={selectedLocation === null}
                      onPress={() => setSelectedLocation(null)}
                      style={styles.locationChip}
                    >
                      Automática
                    </Chip>
                    {availableLocations.filter(l => l.has_capacity).map((loc) => (
                      <Chip
                        key={loc.id}
                        selected={selectedLocation?.id === loc.id}
                        onPress={() => setSelectedLocation(loc)}
                        style={styles.locationChip}
                      >
                        {loc.code} ({loc.available})
                      </Chip>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Button mode="contained" onPress={addItem} style={styles.addButton}>
                Agregar a la lista
              </Button>
            </Surface>
          ) : (
            <View>
              <TextInput
                label="Buscar producto por nombre o SKU"
                value={productSearch}
                onChangeText={(text) => {
                  setProductSearch(text);
                  searchProducts(text);
                }}
                mode="outlined"
                right={<TextInput.Icon icon="magnify" />}
              />

              {loading && <ActivityIndicator style={styles.loader} />}

              {products.length > 0 && (
                <Surface style={styles.productList} elevation={0}>
                  {products.map((product) => (
                    <List.Item
                      key={product.id}
                      title={product.name}
                      description={`SKU: ${product.sku}`}
                      left={(props) => <List.Icon {...props} icon="package-variant" />}
                      onPress={() => {
                        setSelectedProduct(product);
                        setProducts([]);
                        setProductSearch('');
                      }}
                    />
                  ))}
                </Surface>
              )}
            </View>
          )}
        </Surface>

        {items.length > 0 && (
          <Surface style={styles.section} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Productos a Recibir ({items.length})
            </Text>
            
            {items.map((item, index) => {
              const product = products.find(p => p.id === item.product_id);
              return (
                <Surface key={index} style={styles.itemCard} elevation={0}>
                  <View style={styles.itemInfo}>
                    <IconButton icon="package-variant" size={24} iconColor={Colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium">Producto #{item.product_id}</Text>
                      <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>
                        Cantidad: {item.quantity}
                        {item.batch_number && ` | Lote: ${item.batch_number}`}
                        {item.location_id && ` | Ubicación: ${item.location_id}`}
                      </Text>
                    </View>
                    <IconButton
                      icon="delete"
                      iconColor={Colors.danger}
                      onPress={() => removeItem(index)}
                    />
                  </View>
                </Surface>
              );
            })}

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
              icon="check"
            >
              Confirmar Recepción
            </Button>
          </Surface>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: Colors.white,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.text,
  },
  warehouseChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedProduct: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  selectedProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quantityInput: {
    flex: 1,
  },
  batchInput: {
    flex: 1,
  },
  locationSection: {
    marginTop: 12,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  locationChip: {
    marginRight: 8,
  },
  addButton: {
    marginTop: 16,
  },
  loader: {
    marginVertical: 16,
  },
  productList: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    maxHeight: 200,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    padding: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButton: {
    marginTop: 16,
  },
});
