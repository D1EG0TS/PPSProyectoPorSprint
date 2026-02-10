import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Appbar } from 'react-native-paper';
import { locationService } from '../../../../../services/locationService';
import { StorageLocation, ProductLocationAssignment } from '../../../../../types/location';
import { Colors } from '../../../../../constants/Colors';
import { LocationCard } from '../../../../../components/locations/LocationCard';
import { Button } from '../../../../../components/Button';
import { Card } from '../../../../../components/Card';

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [location, setLocation] = useState<StorageLocation | null>(null);
  const [inventory, setInventory] = useState<ProductLocationAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [loc, inv] = await Promise.all([
        locationService.getById(Number(id)),
        locationService.getInventory(Number(id))
      ]);
      setLocation(loc);
      setInventory(inv);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderInventoryItem = ({ item }: { item: ProductLocationAssignment }) => (
    <View style={styles.inventoryItem}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.product?.name || `Producto #${item.product_id}`}</Text>
        <Text style={styles.productSku}>{item.product?.sku}</Text>
      </View>
      <View style={styles.quantityInfo}>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <Text style={styles.unit}>unid.</Text>
      </View>
    </View>
  );

  if (loading || !location) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Detalle de Ubicación" />
        </Appbar.Header>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`Ubicación ${location.code}`} />
      </Appbar.Header>
      
      <ScrollView style={styles.content}>
        <LocationCard location={location} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inventario Actual</Text>
        </View>

        <Card>
          {inventory.length === 0 ? (
            <Text style={styles.emptyText}>Ubicación vacía</Text>
          ) : (
            <FlatList
              data={inventory}
              renderItem={renderInventoryItem}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </Card>

        <View style={styles.actions}>
           <Button 
             onPress={() => alert('Imprimiendo...')} 
             variant="secondary"
             style={styles.actionButton}
           >
             Imprimir Etiqueta
           </Button>
           <Button 
             onPress={() => alert('Editar no implementado')} 
             style={styles.actionButton}
           >
             Editar Ubicación
           </Button>
        </View>
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
  loader: {
    marginTop: 32,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  inventoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  productSku: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quantityInfo: {
    alignItems: 'flex-end',
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  unit: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 40,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  }
});
