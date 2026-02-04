import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, FAB, Portal, Modal, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  getProductById, 
  getProductBatches, 
  createProductBatch, 
  updateProductBatch, 
  Product, 
  ProductBatch,
  ProductBatchCreate,
  ProductBatchUpdate 
} from '../../../../../services/productService';
import { BatchTable } from '../../../../../components/products/BatchTable';

export default function ProductBatchesScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [visible, setVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ProductBatch | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');

  const productId = typeof id === 'string' ? parseInt(id) : 0;

  const loadData = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [productData, batchesData] = await Promise.all([
        getProductById(productId),
        getProductBatches(productId)
      ]);
      setProduct(productData);
      setBatches(batchesData);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load product details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  const showModal = (batch?: ProductBatch) => {
    if (batch) {
      setEditingBatch(batch);
      setBatchNumber(batch.batch_number);
      setQuantity(batch.quantity.toString());
      setMfgDate(batch.manufactured_date || '');
      setExpDate(batch.expiration_date || '');
    } else {
      setEditingBatch(null);
      setBatchNumber('');
      setQuantity('');
      setMfgDate('');
      setExpDate('');
    }
    setVisible(true);
  };

  const hideModal = () => {
    setVisible(false);
    setEditingBatch(null);
  };

  const handleSave = async () => {
    if (!batchNumber || !quantity) {
      Alert.alert('Error', 'Batch Number and Quantity are required');
      return;
    }

    setSaving(true);
    try {
      if (editingBatch) {
        // Update
        const updateData: ProductBatchUpdate = {
          batch_number: batchNumber,
          quantity: parseInt(quantity),
        };
        // Note: Update endpoint in backend might not support updating dates yet based on interface, 
        // but let's check the service. Service sends ProductBatchUpdate which has batch_number and quantity.
        // If we want to update dates, we might need to update the backend or service interface.
        // For now, let's assume only quantity and batch number are updatable as per Sprint 6.1 requirements.
        
        await updateProductBatch(editingBatch.id, updateData);
        Alert.alert('Success', 'Batch updated');
      } else {
        // Create
        const createData: ProductBatchCreate = {
          batch_number: batchNumber,
          quantity: parseInt(quantity),
          manufactured_date: mfgDate || undefined,
          expiration_date: expDate || undefined,
        };
        await createProductBatch(productId, createData);
        Alert.alert('Success', 'Batch created');
      }
      hideModal();
      loadData();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save batch');
    } finally {
      setSaving(false);
    }
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
      <View style={styles.header}>
        <Text variant="headlineSmall">{product?.name}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>SKU: {product?.sku}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <BatchTable 
          batches={batches} 
          onEdit={showModal} 
        />
        {batches.length === 0 && (
          <Text style={styles.emptyText}>No batches found. Create one.</Text>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="white"
        onPress={() => showModal()}
      />

      <Portal>
        <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingBatch ? 'Edit Batch' : 'New Batch'}
          </Text>
          
          <TextInput
            label="Batch Number *"
            value={batchNumber}
            onChangeText={setBatchNumber}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Quantity *"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />

          {!editingBatch && (
            <>
              <TextInput
                label="Manufactured Date (YYYY-MM-DD)"
                value={mfgDate}
                onChangeText={setMfgDate}
                mode="outlined"
                style={styles.input}
                placeholder="2023-01-01"
              />
              
              <TextInput
                label="Expiration Date (YYYY-MM-DD)"
                value={expDate}
                onChangeText={setExpDate}
                mode="outlined"
                style={styles.input}
                placeholder="2023-12-31"
              />
            </>
          )}

          <View style={styles.modalActions}>
            <Button onPress={hideModal} style={styles.button}>Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleSave} 
              loading={saving} 
              disabled={saving}
              style={styles.button}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  content: {
    paddingBottom: 80,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    marginLeft: 8,
  },
});
