import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Appbar } from 'react-native-paper';
import { warehouseService, Location } from '../../../../../services/warehouseService';
import { LocationTree } from '../../../../../components/locations/LocationTree';
import { Colors } from '../../../../../constants/Colors';
import { Card } from '../../../../../components/Card';

export default function WarehouseMapScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseName, setWarehouseName] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [wh, locs] = await Promise.all([
        warehouseService.getWarehouse(Number(id)),
        warehouseService.getLocationsTree(Number(id))
      ]);
      setWarehouseName(wh.name);
      setLocations(locs as Location[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    router.push(`/(dashboard)/moderator/locations/${location.id}/detail`);
  };

  const handleEdit = (location: Location) => {
    router.push(`/(dashboard)/moderator/locations/${location.id}/detail`);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`Mapa: ${warehouseName}`} />
      </Appbar.Header>
      
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : (
          <Card style={styles.treeCard}>
            <LocationTree 
              roots={locations} 
              onEdit={handleEdit}
              onDelete={() => {}}
              onAddChild={() => {}}
            />
          </Card>
        )}
      </View>
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
  loader: {
    marginTop: 32,
  },
  treeCard: {
    flex: 1,
  }
});
