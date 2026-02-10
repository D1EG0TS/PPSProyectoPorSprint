import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Appbar } from 'react-native-paper';
import { useLocationSearch } from '../../../../hooks/useLocationSearch';
import { useLocationAssignment } from '../../../../hooks/useLocationAssignment';
import { locationService } from '../../../../services/locationService';
import { Colors } from '../../../../constants/Colors';
import { Topbar } from '../../../../components/Topbar';
import { Card } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { Input } from '../../../../components/Input';
import { LocationScanner } from '../../../../components/locations/LocationScanner';
import { LocationCard } from '../../../../components/locations/LocationCard';
import { StorageLocation, ProductLocationAssignment } from '../../../../types/location';
import { Ionicons } from '@expo/vector-icons';

export default function RelocateScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // State
  const [sourceLocation, setSourceLocation] = useState<StorageLocation | null>(null);
  const [destLocation, setDestLocation] = useState<StorageLocation | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProductLocationAssignment | null>(null);
  const [quantity, setQuantity] = useState('');
  const [sourceInventory, setSourceInventory] = useState<ProductLocationAssignment[]>([]);
  
  // Hooks
  const { searchByBarcode: searchSource, loading: loadingSource } = useLocationSearch();
  const { searchByBarcode: searchDest, loading: loadingDest } = useLocationSearch();
  const { relocateProduct, loading: relocating } = useLocationAssignment();

  const handleScanSource = async (code: string) => {
    const results = await searchSource(code);
    if (results && (Array.isArray(results) ? results.length > 0 : results)) {
      const loc = Array.isArray(results) ? results[0] : results;
      setSourceLocation(loc);
      // Load inventory
      try {
        const inv = await locationService.getInventory(loc.id);
        setSourceInventory(inv);
        setStep(2);
      } catch (e) {
        Alert.alert('Error', 'No se pudo cargar el inventario de la ubicación');
      }
    } else {
      Alert.alert('Error', 'Ubicación no encontrada');
    }
  };

  const handleScanDest = async (code: string) => {
    const results = await searchDest(code);
    if (results && (Array.isArray(results) ? results.length > 0 : results)) {
      const loc = Array.isArray(results) ? results[0] : results;
      if (loc.id === sourceLocation?.id) {
        Alert.alert('Error', 'La ubicación destino debe ser diferente a la origen');
        return;
      }
      setDestLocation(loc);
    } else {
      Alert.alert('Error', 'Ubicación destino no encontrada');
    }
  };

  const handleSelectItem = (item: ProductLocationAssignment) => {
    setSelectedItem(item);
    setQuantity(item.quantity.toString()); // Default to max
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedItem || !sourceLocation || !destLocation || !quantity) return;

    try {
      await relocateProduct(selectedItem.product_id, {
        from_location_id: sourceLocation.id,
        to_location_id: destLocation.id,
        quantity: Number(quantity),
        reason: 'Reubicación manual'
      });
      Alert.alert('Éxito', 'Producto reubicado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al reubicar');
    }
  };

  const renderStep1 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>1. Escanear Origen</Text>
      <LocationScanner onScan={handleScanSource} isLoading={loadingSource} />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>2. Seleccionar Producto</Text>
        <TouchableOpacity onPress={() => setStep(1)}>
           <Text style={styles.link}>Cambiar Origen</Text>
        </TouchableOpacity>
      </View>
      
      {sourceLocation && <LocationCard location={sourceLocation} showCapacity={false} />}
      
      <Text style={styles.subtitle}>Inventario Disponible:</Text>
      {sourceInventory.length === 0 ? (
        <Text style={styles.empty}>Ubicación vacía</Text>
      ) : (
        sourceInventory.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.itemCard}
            onPress={() => handleSelectItem(item)}
          >
            <View>
              <Text style={styles.itemName}>{item.product?.name}</Text>
              <Text style={styles.itemSku}>{item.product?.sku}</Text>
            </View>
            <Text style={styles.itemQty}>{item.quantity}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>3. Destino y Cantidad</Text>
        <TouchableOpacity onPress={() => setStep(2)}>
           <Text style={styles.link}>Cambiar Producto</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Producto:</Text>
        <Text style={styles.summaryValue}>{selectedItem?.product?.name}</Text>
        <Text style={styles.summaryLabel}>Origen:</Text>
        <Text style={styles.summaryValue}>{sourceLocation?.code}</Text>
      </Card>

      <Text style={styles.label}>Escanear Destino</Text>
      <LocationScanner onScan={handleScanDest} isLoading={loadingDest} />
      
      {destLocation && (
        <View style={styles.destPreview}>
          <LocationCard location={destLocation} onPress={() => {}} />
        </View>
      )}

      <Input
        label="Cantidad a mover"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />

      <Button 
        onPress={handleSubmit} 
        loading={relocating}
        disabled={!destLocation || !quantity}
        style={styles.submitButton}
      >
        Confirmar Reubicación
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Reubicación" />
      </Appbar.Header>
      <ScrollView style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
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
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.text,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  link: {
    color: Colors.primary,
    fontWeight: '500',
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 8,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  itemCard: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  itemSku: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  itemQty: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  empty: {
    fontStyle: 'italic',
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.text,
  },
  destPreview: {
    marginTop: 8,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 20,
  }
});
