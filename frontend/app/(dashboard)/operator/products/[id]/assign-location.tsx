import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Appbar, IconButton, Card as PaperCard } from 'react-native-paper';
import { getProductById } from '../../../../../services/productService';
import { useLocationAssignment } from '../../../../../hooks/useLocationAssignment';
import { useLocationSearch } from '../../../../../hooks/useLocationSearch';
import { Colors } from '../../../../../constants/Colors';
import { Card } from '../../../../../components/Card';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import { LocationScanner } from '../../../../../components/locations/LocationScanner';
import { LocationCard } from '../../../../../components/locations/LocationCard';
import { LocationSelectionDialog } from '../../../../../components/locations/LocationSelectionDialog';
import { warehouseService, Warehouse, Location } from '../../../../../services/warehouseService';
import { StorageLocation } from '../../../../../types/location';
import { Portal, Modal, List } from 'react-native-paper';

export default function AssignLocationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [batchId, setBatchId] = useState('');
  
  // Manual selection state
  const [selectionVisible, setSelectionVisible] = useState(false);
  const [warehouseDialogVisible, setWarehouseDialogVisible] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState<number | undefined>(undefined);
  const [manualLocation, setManualLocation] = useState<StorageLocation | null>(null);

  const { assignProduct, loading: assigning } = useLocationAssignment();
  const { searchByBarcode, locations, loading: searching } = useLocationSearch();
  
  const selectedLocation = manualLocation || (locations.length > 0 ? locations[0] : null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    if (!id) return;
    try {
      const p = await getProductById(Number(id));
      setProduct(p);
    } catch (error) {
      console.error(error);
    }
  };

  const handleScan = async (code: string) => {
    setManualLocation(null); // Clear manual selection on new scan
    await searchByBarcode(code);
  };

  const handleManualSelectStart = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      if (data.length === 0) {
        Alert.alert("Error", "No se encontraron almacenes");
      } else if (data.length === 1) {
        setTargetWarehouseId(data[0].id);
        setSelectionVisible(true);
      } else {
        setWarehouses(data);
        setWarehouseDialogVisible(true);
      }
    } catch (e) {
      Alert.alert("Error", "Error al cargar almacenes");
    }
  };

  const handleWarehouseSelect = (whId: number) => {
    setTargetWarehouseId(whId);
    setWarehouseDialogVisible(false);
    setSelectionVisible(true);
  };

  const handleLocationSelect = (loc: Location) => {
    // Cast Location to StorageLocation (assuming compatibility for required fields)
    setManualLocation(loc as unknown as StorageLocation);
  };

  const handleSubmit = async () => {
    if (!selectedLocation || !quantity) {
      Alert.alert('Error', 'Seleccione ubicación y cantidad');
      return;
    }

    try {
      await assignProduct(
        Number(id),
        selectedLocation.warehouse_id,
        selectedLocation.id,
        Number(quantity),
        batchId ? Number(batchId) : undefined
      );
      Alert.alert('Éxito', 'Producto asignado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al asignar');
    }
  };

  if (!product) return <ActivityIndicator style={styles.loader} />;

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Asignar a Ubicación" />
      </Appbar.Header>
      
      <ScrollView style={styles.content}>
        <Card style={styles.productCard}>
          <Text style={styles.label}>Producto</Text>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.sku}>{product.sku}</Text>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Escanear Ubicación</Text>
          <LocationScanner onScan={handleScan} isLoading={searching} />
          
          <Button 
            onPress={handleManualSelectStart}
            variant="outline"
            style={styles.manualButton}
            icon="format-list-bulleted"
          >
            Seleccionar de Lista
          </Button>
          
          {selectedLocation && (
            <LocationCard 
              location={selectedLocation} 
              onPress={() => {}} // Read-only
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Detalles de Asignación</Text>
          <Input
            label="Cantidad"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="0"
          />
          <Input
            label="Lote (Opcional)"
            value={batchId}
            onChangeText={setBatchId}
            keyboardType="numeric"
            placeholder="ID de lote"
          />
        </View>

        <Button 
          onPress={handleSubmit} 
          loading={assigning}
          disabled={!selectedLocation || !quantity}
          style={styles.submitButton}
        >
          Confirmar Asignación
        </Button>
      </ScrollView>

      <LocationSelectionDialog
        visible={selectionVisible}
        onDismiss={() => setSelectionVisible(false)}
        onSelect={handleLocationSelect}
        warehouseId={targetWarehouseId}
      />

      <Portal>
        <Modal visible={warehouseDialogVisible} onDismiss={() => setWarehouseDialogVisible(false)} contentContainerStyle={styles.modalContainer}>
          <PaperCard>
            <PaperCard.Title title="Seleccionar Almacén" right={(props) => <IconButton {...props} icon="close" onPress={() => setWarehouseDialogVisible(false)} />} />
            <PaperCard.Content>
              <ScrollView style={{ maxHeight: 300 }}>
                {warehouses.map(wh => (
                  <List.Item
                    key={wh.id}
                    title={wh.name}
                    description={wh.code}
                    onPress={() => handleWarehouseSelect(wh.id)}
                    left={props => <List.Icon {...props} icon="office-building" />}
                  />
                ))}
              </ScrollView>
            </PaperCard.Content>
          </PaperCard>
        </Modal>
      </Portal>
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
  loader: {
    marginTop: 32,
  },
  productCard: {
    marginBottom: 20,
    backgroundColor: '#FFF8E1',
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  sku: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.text,
  },
  manualButton: {
    marginBottom: 16,
  },
  modalContainer: {
    padding: 20,
    margin: 20,
  },
  submitButton: {
    marginTop: 12,
    marginBottom: 40,
  }
});
