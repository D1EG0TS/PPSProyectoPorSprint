import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Switch, Text, SegmentedButtons, ActivityIndicator, Portal, Modal, Surface, Menu, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  getProductById, updateProduct, getProductBatches, createProductBatch, updateProductBatch, deleteProductBatch, getCategories, getUnits, getConditions,
  Product, ProductBatch, ProductUpdate, ProductBatchCreate, ProductBatchUpdate, Category, Unit, Condition
} from '../../../../../services/productService';
import Toast from 'react-native-toast-message';
import { BatchTable } from '../../../../../components/products/BatchTable';
import { Input } from '../../../../../components/Input';
import { Button } from '../../../../../components/Button';
import { Layout } from '../../../../../constants/Layout';

export default function EditProductScreen() {
  const { id, tab } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [product, setProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<ProductBatch[]>([]);

  // Metadata
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [showConditionMenu, setShowConditionMenu] = useState(false);

  // Product Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [conditionId, setConditionId] = useState<string>('');
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
      const [cats, uns, conds] = await Promise.all([
        getCategories(), 
        getUnits(),
        getConditions({ include_inactive: true })
      ]);
      setCategories(cats);
      setUnits(uns);
      setConditions(conds);
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
      setBrand(data.brand || '');
      setModel(data.model || '');
      setCategoryId(data.category_id.toString());
      setUnitId(data.unit_id.toString());
      setConditionId(data.condition_id?.toString() || '');
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
        brand: brand || undefined,
        model: model || undefined,
        category_id: parseInt(categoryId),
        unit_id: parseInt(unitId),
        condition_id: conditionId ? parseInt(conditionId) : undefined,
        cost: cost ? parseFloat(cost) : 0,
        price: price ? parseFloat(price) : 0,
        min_stock: minStock ? parseInt(minStock) : 0,
        target_stock: targetStock ? parseInt(targetStock) : 0,
        is_active: isActive,
        has_batch: hasBatch,
        has_expiration: hasExpiration,
      };

      await updateProduct(productId, updateData);
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Producto actualizado correctamente'
      });
      loadData();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || 'No se pudo actualizar el producto';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: msg
      });
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
      Toast.show({ type: 'error', text1: 'Error', text2: 'Número de lote y cantidad requeridos' });
      return;
    }
    if (hasExpiration && !expDate) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'La fecha de expiración es obligatoria' });
      return;
    }

    try {
      if (editingBatch) {
        const updateData: ProductBatchUpdate = {
          quantity: parseInt(batchQty),
          batch_number: batchNumber,
          manufactured_date: mfgDate || undefined,
          expiration_date: expDate || undefined,
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
      Toast.show({ type: 'success', text1: 'Éxito', text2: 'Lote guardado correctamente' });
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || 'No se pudo guardar el lote';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    }
  };

  const getCategoryName = () => {
    return categories.find(c => c.id.toString() === categoryId)?.name || '';
  };

  const getUnitName = () => {
    return units.find(u => u.id.toString() === unitId)?.name || '';
  };

  const getConditionName = () => {
    if (!conditionId) return '';
    return conditions.find(c => c.id.toString() === conditionId)?.name || '';
  };

  const handleDeleteBatch = async (batchId: number) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este lote?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProductBatch(batchId);
              Toast.show({ type: 'success', text1: 'Éxito', text2: 'Lote eliminado' });
              loadBatches();
            } catch (error: any) {
              const msg = error.response?.data?.detail || 'No se pudo eliminar el lote';
              Toast.show({ type: 'error', text1: 'Error', text2: msg });
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          { value: 'details', label: 'Detalles' },
          { value: 'batches', label: 'Lotes', disabled: !hasBatch },
        ]}
        style={styles.tabs}
      />

      {activeTab === 'details' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Input label="SKU" value={sku} onChangeText={setSku} containerStyle={styles.input} />
            <Input label="Código de Barras" value={barcode} onChangeText={setBarcode} containerStyle={styles.input} />
            <Input label="Nombre" value={name} onChangeText={setName} containerStyle={styles.input} />
            <Input label="Descripción" value={description} onChangeText={setDescription} multiline containerStyle={styles.input} />
            
            <View style={styles.row}>
              <Input label="Marca" value={brand} onChangeText={setBrand} containerStyle={[styles.input, styles.halfInput]} />
              <Input label="Modelo" value={model} onChangeText={setModel} containerStyle={[styles.input, styles.halfInput]} />
            </View>
            
            <View style={styles.row}>
              <View style={[styles.halfInput, { marginBottom: 15 }]}>
                <Menu
                  visible={showCategoryMenu}
                  onDismiss={() => setShowCategoryMenu(false)}
                  anchor={
                    <Input
                      label="Categoría"
                      value={getCategoryName()}
                      editable={false}
                      right={<Input.Icon icon="menu-down" onPress={() => setShowCategoryMenu(true)} />}
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
                    <Input
                      label="Unidad"
                      value={getUnitName()}
                      editable={false}
                      right={<Input.Icon icon="menu-down" onPress={() => setShowUnitMenu(true)} />}
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
              <Input label="Costo" value={cost} onChangeText={setCost} keyboardType="numeric" containerStyle={[styles.input, styles.halfInput]} />
              <Input label="Precio" value={price} onChangeText={setPrice} keyboardType="numeric" containerStyle={[styles.input, styles.halfInput]} />
            </View>

            <View style={styles.row}>
              <View style={[styles.halfInput, { marginBottom: 15 }]}>
                <Menu
                  visible={showConditionMenu}
                  onDismiss={() => setShowConditionMenu(false)}
                  anchor={
                    <Input
                      label="Condición (opcional)"
                      value={getConditionName()}
                      editable={false}
                      right={<Input.Icon icon="menu-down" onPress={() => setShowConditionMenu(true)} />}
                    />
                  }
                >
                  <Menu.Item 
                    onPress={() => { setConditionId(''); setShowConditionMenu(false); }} 
                    title="Sin condición" 
                  />
                  {conditions.filter(c => c.is_active).map((cond) => (
                    <Menu.Item 
                      key={cond.id} 
                      onPress={() => { setConditionId(cond.id.toString()); setShowConditionMenu(false); }} 
                      title={cond.name} 
                    />
                  ))}
                </Menu>
              </View>
            </View>

            <View style={styles.row}>
              <Input label="Stock Mínimo" value={minStock} onChangeText={setMinStock} keyboardType="numeric" containerStyle={[styles.input, styles.halfInput]} />
              <Input label="Stock Objetivo" value={targetStock} onChangeText={setTargetStock} keyboardType="numeric" containerStyle={[styles.input, styles.halfInput]} />
            </View>

            <Surface style={[styles.switchContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Activo</Text>
                <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
              </View>
              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Gestión de Lotes</Text>
                <Switch value={hasBatch} onValueChange={setHasBatch} color={theme.colors.primary} />
              </View>
              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Tiene Fecha de Caducidad</Text>
                <Switch value={hasExpiration} onValueChange={setHasExpiration} color={theme.colors.primary} />
              </View>
            </Surface>

            <Button variant="primary" onPress={handleUpdateProduct} loading={saving} style={styles.saveButton}>
              Guardar Cambios
            </Button>
          </View>
        </ScrollView>
      ) : (
        <View style={[styles.batchContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.batchHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>Lotes del Producto</Text>
            <Button variant="primary" onPress={() => openBatchModal()} icon="plus">Agregar Lote</Button>
          </View>
          <BatchTable 
            batches={batches} 
            onEdit={(batch: ProductBatch) => openBatchModal(batch)}
            onDelete={(batchId: number) => handleDeleteBatch(batchId)}
          />
        </View>
      )}

      <Portal>
        <Modal 
          visible={batchModalVisible} 
          onDismiss={() => setBatchModalVisible(false)} 
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            {editingBatch ? 'Editar Lote' : 'Nuevo Lote'}
          </Text>
          
          <Input label="Número de Lote" value={batchNumber} onChangeText={setBatchNumber} containerStyle={styles.input} />
          <Input label="Cantidad" value={batchQty} onChangeText={setBatchQty} keyboardType="numeric" containerStyle={styles.input} />
          
          {(hasExpiration || editingBatch) && (
            <>
              <Input label="Fecha Fabricación (AAAA-MM-DD)" value={mfgDate} onChangeText={setMfgDate} containerStyle={styles.input} placeholder="2023-01-01" />
              <Input label="Fecha Caducidad (AAAA-MM-DD)" value={expDate} onChangeText={setExpDate} containerStyle={styles.input} placeholder="2024-01-01" />
            </>
          )}

          <View style={styles.modalButtons}>
            <Button variant="text" onPress={() => setBatchModalVisible(false)} style={styles.modalButton}>Cancelar</Button>
            <Button variant="primary" onPress={handleSaveBatch} style={styles.modalButton}>Guardar</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    margin: Layout.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.lg,
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  input: {
    marginBottom: Layout.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  switchContainer: {
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  saveButton: {
    marginTop: Layout.spacing.sm,
  },
  batchContainer: {
    flex: 1,
    padding: Layout.spacing.md,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  modalContent: {
    padding: Layout.spacing.lg,
    margin: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  modalTitle: {
    marginBottom: Layout.spacing.lg,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Layout.spacing.md,
  },
  modalButton: {
    marginLeft: Layout.spacing.sm,
  },
});
