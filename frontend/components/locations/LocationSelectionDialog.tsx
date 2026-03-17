import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Portal, Modal, Card, TextInput, List, Button, ActivityIndicator, Searchbar, Text } from 'react-native-paper';
import { warehouseService, Location } from '../../services/warehouseService';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (location: Location) => void;
  warehouseId?: number;
  title?: string;
}

export const LocationSelectionDialog: React.FC<Props> = ({ visible, onDismiss, onSelect, warehouseId, title = "Seleccionar Ubicación" }) => {
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  useEffect(() => {
    if (visible) {
      if (warehouseId) {
        setSelectedWarehouseId(warehouseId);
        loadLocations(warehouseId);
      } else {
        setSelectedWarehouseId(undefined);
        loadWarehouses();
      }
    }
  }, [visible, warehouseId]);

  useEffect(() => {
    if (query.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const lower = query.toLowerCase();
      setFilteredLocations(
        locations.filter(l => 
          l.code.toLowerCase().includes(lower) || 
          l.name.toLowerCase().includes(lower)
        )
      );
    }
  }, [query, locations]);

  const flattenLocations = (locs: Location[]): Location[] => {
    let flat: Location[] = [];
    locs.forEach(loc => {
      flat.push(loc);
      if (loc.children && loc.children.length > 0) {
        flat = flat.concat(flattenLocations(loc.children));
      }
    });
    return flat;
  };

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Error loading warehouses', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async (id: number) => {
    setLoading(true);
    try {
      const data = await warehouseService.getLocations(id);
      const flatData = flattenLocations(data);
      setLocations(flatData);
      setFilteredLocations(flatData);
    } catch (error) {
      console.error('Error loading locations', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseSelect = (id: number) => {
    setSelectedWarehouseId(id);
    loadLocations(id);
  };

  const renderWarehouseItem = ({ item }: { item: any }) => (
    <List.Item
      title={item.name}
      description={item.code}
      left={props => <List.Icon {...props} icon="office-building" />}
      onPress={() => handleWarehouseSelect(item.id)}
      style={styles.item}
    />
  );

  const renderItem = ({ item }: { item: Location }) => (
    <List.Item
      title={item.code}
      description={item.name}
      left={props => <List.Icon {...props} icon="map-marker" />}
      onPress={() => {
        onSelect(item);
        onDismiss();
      }}
      style={styles.item}
    />
  );

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <Card style={styles.card}>
          <Card.Title 
            title={!selectedWarehouseId ? "Seleccionar Almacén" : title} 
            left={(props) => selectedWarehouseId && !warehouseId ? <IconButton {...props} icon="arrow-left" onPress={() => setSelectedWarehouseId(undefined)} /> : null}
            right={(props) => <IconButton {...props} icon="close" onPress={onDismiss} />} 
          />
          <Card.Content style={styles.content}>
            {!selectedWarehouseId ? (
               <FlatList
                data={warehouses}
                renderItem={renderWarehouseItem}
                keyExtractor={item => item.id.toString()}
                ListEmptyComponent={<Text style={styles.empty}>No se encontraron almacenes</Text>}
                style={styles.list}
              />
            ) : (
              <>
                <Searchbar
                  placeholder="Buscar ubicación..."
                  onChangeText={setQuery}
                  value={query}
                  style={styles.searchBar}
                />
                
                {loading ? (
                  <ActivityIndicator style={styles.loader} size="large" />
                ) : (
                  <FlatList
                    data={filteredLocations}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    ListEmptyComponent={<Text style={styles.empty}>No se encontraron ubicaciones</Text>}
                    style={styles.list}
                  />
                )}
              </>
            )}
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
};

// Helper for Close Icon
const IconButton = ({ icon, onPress }: any) => (
  <TouchableOpacity onPress={onPress}>
    <Ionicons
      name={icon === 'close' ? 'close' : icon === 'arrow-left' ? 'arrow-back' : 'help'}
      size={24}
      color={Colors.text}
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  modalContainer: {
    padding: 20,
    maxHeight: '80%',
  },
  card: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  searchBar: {
    marginBottom: 10,
    backgroundColor: Colors.background,
  },
  list: {
    flex: 1,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  loader: {
    marginTop: 20,
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: Colors.gray,
  },
});
