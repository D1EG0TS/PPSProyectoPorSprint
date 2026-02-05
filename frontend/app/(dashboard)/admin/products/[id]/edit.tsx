import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Switch, Text, SegmentedButtons, ActivityIndicator, Portal, Modal, Surface, Menu } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  getProductById, updateProduct, getProductBatches, createProductBatch, updateProductBatch, getCategories, getUnits,
  Product, ProductBatch, ProductUpdate, ProductBatchCreate, ProductBatchUpdate, Category, Unit
} from '../../../../../services/productService';
import { BatchTable } from '../../../../../components/products/BatchTable';

export default function EditProductScreen() {
  const { id, tab } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [product, setProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<ProductBatch[]>([]);

  // Metadata
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showUnitMenu, setShowUnitMenu] = useState(false);

  // Product Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [minStock, setMinStock] = useState('');
  const [targetStock, setTargetStock] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [hasBatch, setHasBatch] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);

  // Batch Modal State
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ProductBatch | null>(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [batchQty, setBatchQty] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');

  const productId = Number(id);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (tab && typeof tab === 'string' && ['details', 'batches'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadMetadata = async () => {
    try {
      const [cats, uns] = await Promise.all([getCategories(), getUnits()]);
      setCategories(cats);
      setUnits(uns);
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getProductById(productId);
      setProduct(data);
      
      // Populate form
      setSku(data.sku);
      setName(data.name);
      setBarcode(data.barcode || '');
      setDescription(data.description || '');
      setCategoryId(data.category_id.toString());
      setUnitId(data.unit_id.toString());
      setCost(data.cost ? data.cost.toString() : '');
      setPrice(data.price ? data.price.toString() : '');
      setMinStock(data.min_stock?.toString() || '');
      setTargetStock(data.target_stock?.toString() || '');
      setIsActive(data.is_active ?? true);
      setHasBatch(data.has_batch ?? false);
      setHasExpiration(data.has_expiration ?? false);

      if (data.has_batch) {
        loadBatches();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load product details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const data = await getProductBatches(productId);
      setBatches(data);
    } catch (error) {
      console.error('Error loading batches:', error);
    }
  };

  const handleUpdateProduct = async () => {
    setSaving(true);
    try {
      const updateData: ProductUpdate = {
        sku,
        name,
        barcode: barcode || undefined,
        description: description || undefined,
        category_id: parseInt(categoryId),
        unit_id: parseInt(unitId),
        cost: cost ? parseFloat(cost) : 0,
        price: price ? parseFloat(price) : 0,
        min_stock: minStock ? parseInt(minStock) : 0,
        target_stock: targetStock ? parseInt(targetStock) : 0,
        is_active: isActive,
        has_batch: hasBatch,
        has_expiration: hasExpiration,
      };

      await updateProduct(productId, updateData);
      Alert.alert('Success', 'Product updated successfully');
      loadData(); // Reload to ensure sync
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const openBatchModal = (batch?: ProductBatch) => {
    if (batch) {
      setEditingBatch(batch);
      setBatchNumber(batch.batch_number);
      setBatchQty(batch.quantity.toString());
      setMfgDate(batch.manufactured_date || '');
      setExpDate(batch.expiration_date || '');
    } else {
      setEditingBatch(null);
      setBatchNumber('');
      setBatchQty('');
      setMfgDate('');
      setExpDate('');
    }
    setBatchModalVisible(true);
  };

  const handleSaveBatch = async () => {
    if (!batchNumber || !batchQty) {
      Alert.alert('Error', 'Batch Number and Quantity are required');
      return;
    }
    if (hasExpiration && !expDate) {
      Alert.alert('Error', 'Expiration Date is required');
      return;
    }

    try {
      if (editingBatch) {
        const updateData: ProductBatchUpdate = {
          quantity: parseInt(batchQty),
          // batch_number: batchNumber // Usually typically handled, but schema allows it?
          // Checking ProductBatchUpdate interface: it allows batch_number and quantity.
          batch_number: batchNumber,
        };
        await updateProductBatch(editingBatch.id, updateData);
      } else {
        const createData: ProductBatchCreate = {
          batch_number: batchNumber,
          quantity: parseInt(batchQty),
          manufactured_date: mfgDate || undefined,
          expiration_date: expDate || undefined,
        };
        await createProductBatch(productId, createData);
      }
      setBatchModalVisible(false);
      loadBatches();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save batch');
    }
  };

  const getCategoryName = () => {
    return categories.find(c => c.id.toString() === categoryId)?.name || '';
  };

  const getUnitName = () => {
    return units.find(u => u.id.toString() === unitId)?.name || '';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          { value: 'details', label: 'Details' },
          { value: 'batches', label: 'Batches', disabled: !hasBatch },
        ]}
        style={styles.tabs}
      />

      {activeTab === 'details' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <TextInput label="SKU" value={sku} onChangeText={setSku} mode="outlined" style={styles.input} />
            <TextInput label="Barcode" value={barcode} onChangeText={setBarcode} mode="outlined" style={styles.input} />
            <TextInput label="Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
            <TextInput label="Description" value={description} onChangeText={setDescription} mode="outlined" multiline style={styles.input} />
            
            <View style={styles.row}>
              <View style={[styles.halfInput, { marginBottom: 15 }]}>
                <Menu
                  visible={showCategoryMenu}
                  onDismiss={() => setShowCategoryMenu(false)}
                  anchor={
                    <TextInput
                      label="Category"
                      value={getCategoryName()}
                      mode="outlined"
                      editable={false}
                      right={<TextInput.Icon icon="menu-down" onPress={() => setShowCategoryMenu(true)} />}
                      style={{ backgroundColor: 'white' }}
                    />
                  }
                >
                  {categories.map((cat) => (
                    <Menu.Item 
                      key={cat.id} 
                      onPress={() => { setCategoryId(cat.id.toString()); setShowCategoryMenu(false); }} 
                      title={cat.name} 
                    />
                  ))}
                </Menu>
              </View>

              <View style={[styles.halfInput, { marginBottom: 15 }]}>
                <Menu
                  visible={showUnitMenu}
                  onDismiss={() => setShowUnitMenu(false)}
                  anchor={
                    <TextInput
                      label="Unit"
                      value={getUnitName()}
                      mode="outlined"
                      editable={false}
                      right={<TextInput.Icon icon="menu-down" onPress={() => setShowUnitMenu(true)} />}
                      style={{ backgroundColor: 'white' }}
                    />
                  }
                >
                  {units.map((u) => (
                    <Menu.Item 
                      key={u.id} 
                      onPress={() => { setUnitId(u.id.toString()); setShowUnitMenu(false); }} 
                      title={u.name} 
                    />
                  ))}
                </Menu>
              </View>
            </View>

            <View style={styles.row}>
              <TextInput label="Cost" value={cost} onChangeText={setCost} keyboardType="numeric" mode="outlined" style={[styles.input, styles.halfInput]} />
              <TextInput label="Price" value={price} onChangeText={setPrice} keyboardType="numeric" mode="outlined" style={[styles.input, styles.halfInput]} />
            </View>

            <View style={styles.row}>
              <TextInput label="Min Stock" value={minStock} onChangeText={setMinStock} keyboardType="numeric" mode="outlined" style={[styles.input, styles.halfInput]} />
              <TextInput label="Target Stock" value={targetStock} onChangeText={setTargetStock} keyboardType="numeric" mode="outlined" style={[styles.input, styles.halfInput]} />
            </View>

            <Surface style={styles.switchContainer} elevation={1}>
              <View style={styles.switchRow}>
                <Text>Active</Text>
                <Switch value={isActive} onValueChange={setIsActive} />
              </View>
              <View style={styles.switchRow}>
                <Text>Has Batch Management</Text>
                <Switch value={hasBatch} onValueChange={setHasBatch} />
              </View>
              <View style={styles.switchRow}>
                <Text>Has Expiration Date</Text>
                <Switch value={hasExpiration} onValueChange={setHasExpiration} />
              </View>
            </Surface>

            <Button mode="contained" onPress={handleUpdateProduct} loading={saving} style={styles.saveButton}>
              Save Changes
            </Button>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.batchContainer}>
          <View style={styles.batchHeader}>
            <Text variant="titleMedium">Product Batches</Text>
            <Button mode="contained" onPress={() => openBatchModal()} icon="plus">Add Batch</Button>
          </View>
          <BatchTable 
                    batches={batches} 
                    onEdit={(batch: ProductBatch) => openBatchModal(batch)} 
                  />
        </View>
      )}

      <Portal>
        <Modal visible={batchModalVisible} onDismiss={() => setBatchModalVisible(false)} contentContainerStyle={styles.modalContent}>
          <Text variant="headlineSmall" style={styles.modalTitle}>{editingBatch ? 'Edit Batch' : 'New Batch'}</Text>
          
          <TextInput label="Batch Number" value={batchNumber} onChangeText={setBatchNumber} mode="outlined" style={styles.input} />
          <TextInput label="Quantity" value={batchQty} onChangeText={setBatchQty} keyboardType="numeric" mode="outlined" style={styles.input} />
          
          {!editingBatch && (
             <>
              <TextInput label="Mfg Date (YYYY-MM-DD)" value={mfgDate} onChangeText={setMfgDate} mode="outlined" style={styles.input} placeholder="2023-01-01" />
              <TextInput label="Exp Date (YYYY-MM-DD)" value={expDate} onChangeText={setExpDate} mode="outlined" style={styles.input} placeholder="2024-01-01" />
             </>
          )}

          <View style={styles.modalButtons}>
            <Button onPress={() => setBatchModalVisible(false)} style={styles.modalButton}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveBatch} style={styles.modalButton}>Save</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    margin: 15,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  switchContainer: {
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButton: {
    marginTop: 10,
  },
  batchContainer: {
    flex: 1,
    padding: 15,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modalButton: {
    marginLeft: 10,
  },
});
