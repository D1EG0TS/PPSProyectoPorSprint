import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Pressable, Platform } from 'react-native';
import { TextInput, Button, HelperText, Switch, Text, ProgressBar, useTheme, Surface, Menu, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { createProduct, createProductBatch, getProductByCode, getCategories, getUnits, ProductCreate, ProductBatchCreate, Category, Unit } from '../../../../services/productService';
import { useAuth } from '../../../../hooks/useAuth';
import { USER_ROLES } from '../../../../constants/roles';

export default function CreateProductScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Snackbar State
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState(theme.colors.error);

  const showSnackbar = (message: string, isError = true) => {
    setSnackbarMessage(message);
    setSnackbarColor(isError ? theme.colors.error : theme.colors.primary);
    setSnackbarVisible(true);
  };

  // Check Permissions
  useEffect(() => {
    // console.log('Checking permissions:', user);
    if (user && user.role_id !== USER_ROLES.SUPER_ADMIN && user.role_id !== USER_ROLES.ADMIN) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para acceder a esta sección.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [user]);

  // Data Sources
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showUnitMenu, setShowUnitMenu] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const [cats, uns] = await Promise.all([getCategories(), getUnits()]);
      setCategories(cats);
      setUnits(uns);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Error al cargar categorías/unidades');
    }
  };

  // Step 1: Basic Info
  const [sku, setSku] = useState('');
  const [skuError, setSkuError] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [unitId, setUnitId] = useState('');
  const [unitError, setUnitError] = useState('');

  // Step 2: Config & Pricing
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [minStock, setMinStock] = useState('');
  const [targetStock, setTargetStock] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [hasBatch, setHasBatch] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);

  // Step 3: Initial Batch (if hasBatch)
  const [batchNumber, setBatchNumber] = useState('');
  const [batchQty, setBatchQty] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');

  const validateSku = async () => {
    if (!sku) return;
    try {
      const existing = await getProductByCode(sku);
      if (existing) {
        setSkuError('El SKU ya existe');
      } else {
        setSkuError('');
      }
    } catch (error) {
      console.error('Error checking SKU:', error);
    }
  };

  const validateStep1 = () => {
    let isValid = true;
    
    if (!sku) { setSkuError('SKU es requerido'); isValid = false; }
    if (!name) { setNameError('Nombre es requerido'); isValid = false; }
    if (!categoryId) { setCategoryError('Categoría es requerida'); isValid = false; }
    if (!unitId) { setUnitError('Unidad es requerida'); isValid = false; }
    
    if (!isValid) {
      showSnackbar('Por favor completa los campos requeridos', true);
      return false;
    }

    if (skuError) {
      showSnackbar('El SKU es inválido o ya existe', true);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    // Numeric checks could be added here
    return true;
  };

  const validateStep3 = () => {
    if (!hasBatch) return true;
    if (!batchNumber || !batchQty) {
      showSnackbar('El número de lote y la cantidad son requeridos', true);
      return false;
    }
    if (hasExpiration && !expDate) {
      showSnackbar('La fecha de caducidad es requerida', true);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!validateStep1()) return;
      setStep(1);
    } else if (step === 1) {
      if (!validateStep2()) return;
      if (hasBatch) {
        setStep(2);
      } else {
        handleSubmit();
      }
    } else {
      if (!validateStep3()) return;
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const productData: ProductCreate = {
        sku,
        barcode: barcode || undefined,
        name,
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

      const newProduct = await createProduct(productData);

      if (hasBatch && batchNumber) {
        const batchData: ProductBatchCreate = {
          batch_number: batchNumber,
          quantity: parseInt(batchQty),
          manufactured_date: mfgDate || undefined,
          expiration_date: expDate || undefined,
        };
        await createProductBatch(newProduct.id, batchData);
      }

      showSnackbar('Producto registrado exitosamente', false);
      setTimeout(() => {
        router.replace('/admin/products');
      }, 1500);
    } catch (error: any) {
      console.error(error);
      showSnackbar(error.response?.data?.detail || 'Error al registrar el producto', true);
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = hasBatch ? 3 : 2;
  const progress = (step + 1) / totalSteps;

  const getCategoryName = () => {
    return categories.find(c => c.id.toString() === categoryId)?.name || '';
  };

  const getUnitName = () => {
    return units.find(u => u.id.toString() === unitId)?.name || '';
  };

  return (
    <View style={styles.container}>
      <View style={{ width: '100%', height: 4, zIndex: 1 }}>
        <ProgressBar progress={progress} color={theme.colors.primary} style={{ height: 4 }} />
      </View>
      
      <View style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <Text variant="headlineMedium" style={styles.title}>
          {step === 0 ? 'Información Básica' : step === 1 ? 'Configuración y Precios' : 'Lote Inicial'}
        </Text>

        {step === 0 && (
          <View style={styles.stepContainer}>
            <TextInput
              label="SKU *"
              value={sku}
              onChangeText={(text) => { setSku(text); setSkuError(''); }}
              onBlur={validateSku}
              mode="outlined"
              error={!!skuError}
              style={styles.input}
            />
            {!!skuError && <HelperText type="error">{skuError}</HelperText>}

            <TextInput
              label="Código de Barras"
              value={barcode}
              onChangeText={setBarcode}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Nombre *"
              value={name}
              onChangeText={(text) => { setName(text); setNameError(''); }}
              mode="outlined"
              error={!!nameError}
              style={styles.input}
            />
            {!!nameError && <HelperText type="error">{nameError}</HelperText>}

            <TextInput
              label="Descripción"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.row}>
              <View style={[styles.halfInput, { marginBottom: 15 }]}>
                <Menu
                  visible={showCategoryMenu}
                  onDismiss={() => setShowCategoryMenu(false)}
                  anchor={
                    <Pressable onPress={() => setShowCategoryMenu(true)}>
                      <View pointerEvents="none">
                        <TextInput
                          label="Categoría *"
                          value={getCategoryName()}
                          mode="outlined"
                          editable={false}
                          error={!!categoryError}
                          right={<TextInput.Icon icon="menu-down" />}
                          style={{ backgroundColor: 'white' }}
                        />
                      </View>
                    </Pressable>
                  }
                >
                  {categories.map((cat) => (
                    <Menu.Item 
                      key={cat.id} 
                      onPress={() => { setCategoryId(cat.id.toString()); setCategoryError(''); setShowCategoryMenu(false); }} 
                      title={cat.name} 
                    />
                  ))}
                </Menu>
                {!!categoryError && <HelperText type="error">{categoryError}</HelperText>}
              </View>

              <View style={[styles.halfInput, { marginBottom: 15 }]}>
                <Menu
                  visible={showUnitMenu}
                  onDismiss={() => setShowUnitMenu(false)}
                  anchor={
                    <Pressable onPress={() => setShowUnitMenu(true)}>
                      <View pointerEvents="none">
                         <TextInput
                          label="Unidad *"
                          value={getUnitName()}
                          mode="outlined"
                          editable={false}
                          error={!!unitError}
                          right={<TextInput.Icon icon="menu-down" />}
                          style={{ backgroundColor: 'white' }}
                        />
                      </View>
                    </Pressable>
                  }
                >
                  {units.map((u) => (
                    <Menu.Item 
                      key={u.id} 
                      onPress={() => { setUnitId(u.id.toString()); setUnitError(''); setShowUnitMenu(false); }} 
                      title={u.name} 
                    />
                  ))}
                </Menu>
                {!!unitError && <HelperText type="error">{unitError}</HelperText>}
              </View>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.row}>
              <TextInput
                label="Costo"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                left={<TextInput.Affix text="$" />}
              />
              <TextInput
                label="Precio"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                left={<TextInput.Affix text="$" />}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                label="Stock Mínimo"
                value={minStock}
                onChangeText={setMinStock}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                label="Stock Objetivo"
                value={targetStock}
                onChangeText={setTargetStock}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
            </View>

            <Surface style={styles.switchContainer} elevation={1}>
              <View style={styles.switchRow}>
                <Text>Activo</Text>
                <Switch value={isActive} onValueChange={setIsActive} />
              </View>
              <View style={styles.switchRow}>
                <Text>Gestiona Lotes</Text>
                <Switch value={hasBatch} onValueChange={setHasBatch} />
              </View>
              <View style={styles.switchRow}>
                <Text>Tiene Fecha de Caducidad</Text>
                <Switch value={hasExpiration} onValueChange={setHasExpiration} />
              </View>
            </Surface>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.subtitle}>Detalles del Lote Inicial</Text>
            <TextInput
              label="Número de Lote *"
              value={batchNumber}
              onChangeText={setBatchNumber}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Cantidad *"
              value={batchQty}
              onChangeText={setBatchQty}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Fecha de Fabricación (AAAA-MM-DD)"
              value={mfgDate}
              onChangeText={setMfgDate}
              mode="outlined"
              style={styles.input}
              placeholder="2023-01-01"
            />
            <TextInput
              label={`Fecha de Caducidad${hasExpiration ? ' *' : ''} (AAAA-MM-DD)`}
              value={expDate}
              onChangeText={setExpDate}
              mode="outlined"
              style={styles.input}
              placeholder="2024-01-01"
              error={hasExpiration && !expDate}
            />
          </View>
        )}

        <View style={styles.buttonRow}>
          {step > 0 && (
            <Button mode="outlined" onPress={handleBack} style={styles.button} disabled={loading}>
              Atrás
            </Button>
          )}
          <Button 
            mode="contained" 
            onPress={handleNext} 
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            {step === totalSteps - 1 ? 'Registrar Producto' : 'Siguiente'}
          </Button>
        </View>
      </ScrollView>
      </View>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: snackbarColor }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
    minHeight: 300, 
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContainer: {
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
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});
