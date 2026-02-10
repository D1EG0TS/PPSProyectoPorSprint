import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Modal, Portal, Text, Button, IconButton, Divider, TextInput } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useRequestCart } from '../../../context/RequestCartContext';
import { warehouseService, Warehouse } from '../../../services/warehouseService';
import { Colors } from '../../../constants/Colors';
import { useRouter } from 'expo-router';

interface RequestCartProps {
  visible: boolean;
  onDismiss: () => void;
}

export const RequestCart: React.FC<RequestCartProps> = ({ visible, onDismiss }) => {
  const { 
    items, 
    removeFromCart, 
    updateQuantity, 
    updateNotes, 
    clearCart,
    sourceWarehouseId,
    setSourceWarehouseId,
    destinationWarehouseId,
    setDestinationWarehouseId
  } = useRequestCart();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses', error);
    }
  };

  const handleCreateRequest = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before creating a request.');
      return;
    }
    // Navigate to the full creation flow
    onDismiss();
    router.push('/(operator)/requests/create/from-catalog');
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text variant="titleLarge">Request Cart ({items.length})</Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

        <ScrollView style={styles.content}>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Text>Your cart is empty.</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.product.id} style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                  <Text variant="titleMedium" style={styles.itemName}>{item.product.name}</Text>
                  <IconButton 
                    icon="delete" 
                    iconColor={Colors.error} 
                    size={20} 
                    onPress={() => removeFromCart(item.product.id)} 
                  />
                </View>
                <Text variant="bodySmall" style={styles.sku}>SKU: {item.product.sku}</Text>
                
                <View style={styles.controls}>
                  <View style={styles.quantityControl}>
                    <IconButton 
                      icon="minus" 
                      size={16} 
                      onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    />
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <IconButton 
                      icon="plus" 
                      size={16} 
                      onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                      // Optional: disable if > available_stock (if rule applies)
                      // disabled={item.quantity >= item.product.available_stock}
                    />
                  </View>
                  <TextInput
                    mode="outlined"
                    label="Notes"
                    value={item.notes || ''}
                    onChangeText={(text) => updateNotes(item.product.id, text)}
                    style={styles.notesInput}
                    dense
                  />
                </View>
                <Divider style={styles.divider} />
              </View>
            ))
          )}

          {items.length > 0 && (
            <View style={styles.warehouseSection}>
              <Text variant="titleMedium" style={{ marginTop: 10 }}>Warehouses</Text>
              
              <Text variant="labelMedium" style={{ marginTop: 10 }}>Source (Optional)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={sourceWarehouseId}
                  onValueChange={(val) => setSourceWarehouseId(val)}
                >
                  <Picker.Item label="Select Source Warehouse" value={null} />
                  {warehouses.map(w => (
                    <Picker.Item key={w.id} label={w.name} value={w.id} />
                  ))}
                </Picker>
              </View>

              <Text variant="labelMedium" style={{ marginTop: 10 }}>Destination</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={destinationWarehouseId}
                  onValueChange={(val) => setDestinationWarehouseId(val)}
                >
                  <Picker.Item label="Select Destination Warehouse" value={null} />
                  {warehouses.map(w => (
                    <Picker.Item key={w.id} label={w.name} value={w.id} />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
           <Button mode="outlined" onPress={clearCart} style={styles.clearBtn} disabled={items.length === 0}>
            Clear
          </Button>
          <Button 
            mode="contained" 
            onPress={handleCreateRequest} 
            style={styles.createBtn}
            disabled={items.length === 0}
          >
            Proceed to Request
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    padding: 20,
  },
  itemContainer: {
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    flex: 1,
  },
  sku: {
    color: Colors.gray,
    marginBottom: 5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 20,
    textAlign: 'center',
  },
  notesInput: {
    flex: 1,
    height: 40,
    fontSize: 12,
  },
  divider: {
    marginTop: 10,
  },
  warehouseSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginTop: 5,
    backgroundColor: '#fff',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearBtn: {
    flex: 1,
    marginRight: 10,
  },
  createBtn: {
    flex: 2,
  }
});
