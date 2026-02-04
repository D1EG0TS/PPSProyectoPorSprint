import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, HelperText, Switch, Text, ProgressBar, useTheme, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { createProduct, createProductBatch, getProductByCode, ProductCreate, ProductBatchCreate } from '../../../../services/productService';

export default function CreateProductScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [sku, setSku] = useState('');
  const [skuError, setSkuError] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');

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
        setSkuError('SKU already exists');
      } else {
        setSkuError('');
      }
    } catch (error) {
      console.error('Error checking SKU:', error);
    }
  };

  const validateStep1 = () => {
    if (!sku || !name || !categoryId || !unitId) {
      Alert.alert('Error', 'Please fill in all required fields (SKU, Name, Category, Unit)');
      return false;
    }
    if (skuError) {
      Alert.alert('Error', 'SKU is invalid or already taken');
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
      Alert.alert('Error', 'Batch Number and Quantity are required for initial batch');
      return false;
    }
    if (hasExpiration && !expDate) {
      Alert.alert('Error', 'Expiration Date is required for this product type');
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
        // Skip step 2 if no batch, go to review or submit? 
        // Let's just submit from here or show a review step?
        // Prompt says "multi-step". Let's treat step 2 as the final step if no batch, but button should change to "Submit"
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

      Alert.alert('Success', 'Product created successfully', [
        { text: 'OK', onPress: () => router.replace('/admin/products') }
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = hasBatch ? 3 : 2;
  const progress = (step + 1) / totalSteps;

  return (
    <View style={styles.container}>
      <ProgressBar progress={progress} color={theme.colors.primary} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={styles.title}>
          {step === 0 ? 'Basic Information' : step === 1 ? 'Configuration & Pricing' : 'Initial Batch'}
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
              label="Barcode"
              value={barcode}
              onChangeText={setBarcode}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Name *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.row}>
              <TextInput
                label="Category ID *"
                value={categoryId}
                onChangeText={setCategoryId}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                label="Unit ID *"
                value={unitId}
                onChangeText={setUnitId}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.row}>
              <TextInput
                label="Cost"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                left={<TextInput.Affix text="$" />}
              />
              <TextInput
                label="Price"
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
                label="Min Stock"
                value={minStock}
                onChangeText={setMinStock}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                label="Target Stock"
                value={targetStock}
                onChangeText={setTargetStock}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
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
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.subtitle}>Initial Batch Details</Text>
            <TextInput
              label="Batch Number *"
              value={batchNumber}
              onChangeText={setBatchNumber}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Quantity *"
              value={batchQty}
              onChangeText={setBatchQty}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Manufactured Date (YYYY-MM-DD)"
              value={mfgDate}
              onChangeText={setMfgDate}
              mode="outlined"
              style={styles.input}
              placeholder="2023-01-01"
            />
            <TextInput
              label={`Expiration Date${hasExpiration ? ' *' : ''} (YYYY-MM-DD)`}
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
              Back
            </Button>
          )}
          <Button 
            mode="contained" 
            onPress={handleNext} 
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            {step === totalSteps - 1 ? 'Create Product' : 'Next'}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
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
