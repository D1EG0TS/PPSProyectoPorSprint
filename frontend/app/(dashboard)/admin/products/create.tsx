import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Pressable, Platform, Image } from 'react-native';
import { TextInput as PaperTextInput, Button as PaperButton, HelperText, Switch, Text, ProgressBar, useTheme, Surface, Menu, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { createProduct, createProductBatch, getProductByCode, getCategories, getUnits, uploadProductImage, ProductCreate, ProductBatchCreate, Category, Unit } from '../../../../services/productService';
import { useAuth } from '../../../../hooks/useAuth';
import { USER_ROLES } from '../../../../constants/roles';
import { Input } from '../../../../components/Input';
import { Button } from '../../../../components/Button';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Layout } from '../../../../constants/Layout';

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
  const [showSubCategoryMenu, setShowSubCategoryMenu] = useState(false);
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
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // New state for image
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
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

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setImageUrl(''); // Clear manual URL if image picked
    }
  };

  const validateSku = async () => {
    if (!sku) return; // SKU is optional now (auto-generated)
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
    
    // SKU is optional
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
        sku: sku || undefined, // Send undefined to trigger auto-generation
        barcode: barcode || undefined,
        name,
        brand: brand || undefined,
        model: model || undefined,
        image_url: imageUrl || undefined,
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

      const newProduct = await createProduct(productData, selectedImage || undefined);

      if (hasBatch && batchNumber) {
        // ... batch logic
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
      let errorMessage = 'Error al registrar el producto';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // Handle FastAPI validation errors (array of objects)
          errorMessage = detail.map((err: any) => err.msg || JSON.stringify(err)).join('\n');
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail);
        }
      }
      showSnackbar(errorMessage, true);
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ width: '100%', height: 4, zIndex: 1 }}>
        <ProgressBar progress={progress} color={theme.colors.primary} style={{ height: 4 }} />
      </View>
      
      <ScreenContainer>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          {step === 0 ? 'Información Básica' : step === 1 ? 'Configuración y Precios' : 'Lote Inicial'}
        </Text>

        {step === 0 && (
          <View style={styles.stepContainer}>
            <Input
              label="SKU (Opcional - Auto)"
              value={sku}
              onChangeText={(text) => { setSku(text); setSkuError(''); }}
              onBlur={validateSku}
              error={skuError}
            />

            <Input
              label="Código de Barras"
              value={barcode}
              onChangeText={setBarcode}
            />

            <Input
              label="Nombre *"
              value={name}
              onChangeText={(text) => { setName(text); setNameError(''); }}
              error={nameError}
            />

            <View style={styles.row}>
              <Input
                label="Marca"
                value={brand}
                onChangeText={setBrand}
                containerStyle={styles.halfInput}
              />
              <Input
                label="Modelo"
                value={model}
                onChangeText={setModel}
                containerStyle={styles.halfInput}
              />
            </View>

            <View style={styles.imagePickerContainer}>
                {(selectedImage || imageUrl) && (
                    <Image 
                        source={{ uri: selectedImage || imageUrl }} 
                        style={[styles.previewImage, { backgroundColor: theme.colors.surfaceVariant }]} 
                    />
                )}
                <Button variant="outline" onPress={pickImage} icon="camera" style={{marginBottom: 10}}>
                    Seleccionar Imagen Local
                </Button>
                <Input
                  label="O ingresar URL Imagen Externa"
                  value={imageUrl}
                  onChangeText={(text) => { setImageUrl(text); setSelectedImage(null); }}
                />
            </View>

            <Input
              label="Descripción"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.row}>
              <View style={[styles.halfInput, { marginBottom: 15 }]}>
                <Menu
                  visible={showCategoryMenu}
                  onDismiss={() => setShowCategoryMenu(false)}
                  anchor={
                    <Pressable onPress={() => setShowCategoryMenu(true)}>
                      <View pointerEvents="none">
                        <Input
                          label="Categoría *"
                          value={categories.find(c => c.id.toString() === parentCategoryId)?.name || ''}
                          editable={false}
                          error={categoryError}
                          right={<PaperTextInput.Icon icon="menu-down" />}
                        />
                      </View>
                    </Pressable>
                  }
                >
                  {categories.filter(c => !c.parent_id).map((cat) => (
                    <Menu.Item 
                      key={cat.id} 
                      onPress={() => { 
                          setParentCategoryId(cat.id.toString()); 
                          setCategoryId(cat.id.toString());
                          setCategoryError(''); 
                          setShowCategoryMenu(false); 
                      }} 
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
                    <Pressable onPress={() => setShowUnitMenu(true)}>
                      <View pointerEvents="none">
                         <Input
                          label="Unidad *"
                          value={getUnitName()}
                          editable={false}
                          error={unitError}
                          right={<PaperTextInput.Icon icon="menu-down" />}
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
              </View>
            </View>

            {(() => {
                const parent = categories.find(c => c.id.toString() === parentCategoryId);
                const subCats = parent?.subcategories && parent.subcategories.length > 0 
                    ? parent.subcategories 
                    : categories.filter(c => c.parent_id === parseInt(parentCategoryId));
                
                if (subCats.length > 0) {
                    return (
                        <View style={{ marginBottom: 15 }}>
                            <Menu
                              visible={showSubCategoryMenu}
                              onDismiss={() => setShowSubCategoryMenu(false)}
                              anchor={
                                <Pressable onPress={() => setShowSubCategoryMenu(true)}>
                                  <View pointerEvents="none">
                                    <Input
                                      label="Subcategoría"
                                      value={
                                          (categoryId !== parentCategoryId) 
                                          ? (subCats.find(s => s.id.toString() === categoryId)?.name || categories.find(c => c.id.toString() === categoryId)?.name || '') 
                                          : ''
                                      }
                                      editable={false}
                                      right={<PaperTextInput.Icon icon="menu-down" />}
                                    />
                                  </View>
                                </Pressable>
                              }
                            >
                                <Menu.Item 
                                  onPress={() => { 
                                      setCategoryId(parentCategoryId); 
                                      setShowSubCategoryMenu(false); 
                                  }} 
                                  title="(Ninguna)" 
                                />
                              {subCats.map((cat) => (
                                <Menu.Item 
                                  key={cat.id} 
                                  onPress={() => { 
                                      setCategoryId(cat.id.toString()); 
                                      setShowSubCategoryMenu(false); 
                                  }} 
                                  title={cat.name} 
                                />
                              ))}
                            </Menu>
                        </View>
                    );
                }
                return null;
            })()}
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.row}>
              <Input
                label="Costo"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                containerStyle={styles.halfInput}
                left={<PaperTextInput.Affix text="$" />}
              />
              <Input
                label="Precio"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                containerStyle={styles.halfInput}
                left={<PaperTextInput.Affix text="$" />}
              />
            </View>

            <View style={styles.row}>
              <Input
                label="Stock Mínimo"
                value={minStock}
                onChangeText={setMinStock}
                keyboardType="numeric"
                containerStyle={styles.halfInput}
              />
              <Input
                label="Stock Objetivo"
                value={targetStock}
                onChangeText={setTargetStock}
                keyboardType="numeric"
                containerStyle={styles.halfInput}
              />
            </View>

            <Surface style={[styles.switchContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Activo</Text>
                <Switch value={isActive} onValueChange={setIsActive} color={theme.colors.primary} />
              </View>
              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Gestiona Lotes</Text>
                <Switch value={hasBatch} onValueChange={setHasBatch} color={theme.colors.primary} />
              </View>
              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Tiene Fecha de Caducidad</Text>
                <Switch value={hasExpiration} onValueChange={setHasExpiration} color={theme.colors.primary} />
              </View>
            </Surface>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.subtitle, { color: theme.colors.onSurface }]}>Detalles del Lote Inicial</Text>
            <Input
              label="Número de Lote *"
              value={batchNumber}
              onChangeText={setBatchNumber}
            />
            <Input
              label="Cantidad *"
              value={batchQty}
              onChangeText={setBatchQty}
              keyboardType="numeric"
            />
            <Input
              label="Fecha de Fabricación (AAAA-MM-DD)"
              value={mfgDate}
              onChangeText={setMfgDate}
              placeholder="2023-01-01"
            />
            <Input
              label={`Fecha de Caducidad${hasExpiration ? ' *' : ''} (AAAA-MM-DD)`}
              value={expDate}
              onChangeText={setExpDate}
              placeholder="2024-01-01"
              error={hasExpiration && !expDate ? 'Requerido' : undefined}
            />
          </View>
        )}

        <View style={styles.buttonRow}>
          {step > 0 && (
            <Button variant="outline" onPress={handleBack} style={styles.button} disabled={loading}>
              Atrás
            </Button>
          )}
          <Button 
            variant="primary" 
            onPress={handleNext} 
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            {step === totalSteps - 1 ? 'Registrar Producto' : 'Siguiente'}
          </Button>
        </View>
      </ScreenContainer>
      
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
  title: {
    marginBottom: Layout.spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: Layout.spacing.sm,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContainer: {
    marginBottom: Layout.spacing.lg,
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
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Layout.spacing.lg,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  imagePickerContainer: {
    marginBottom: 15,
    alignItems: 'center',
    width: '100%',
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: 'cover',
  },
});