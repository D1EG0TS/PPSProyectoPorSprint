import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Dialog, Portal, Button, TextInput, RadioButton, Text, Menu, Divider, HelperText } from 'react-native-paper';
import { MaintenancePart } from '../../types/maintenance';
import { Product } from '../../services/productService';
import { Warehouse } from '../../services/warehouseService';
import { ProductSearch } from '../products/ProductSearch';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSave: (part: MaintenancePart) => void;
  warehouses: Warehouse[];
  initialPart?: MaintenancePart;
}

export function AddPartDialog({ visible, onDismiss, onSave, warehouses, initialPart }: Props) {
  const [mode, setMode] = useState<'inventory' | 'manual'>('inventory');
  const [partName, setPartName] = useState('');
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [totalCost, setTotalCost] = useState(0);
  
  // Menu state
  const [warehouseMenuVisible, setWarehouseMenuVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialPart) {
        setMode(initialPart.product_id ? 'inventory' : 'manual');
        setPartName(initialPart.part_name);
        setProductId(initialPart.product_id);
        setWarehouseId(initialPart.warehouse_id);
        setQuantity(String(initialPart.quantity));
        setUnitCost(String(initialPart.unit_cost || ''));
        setTotalCost(initialPart.total_cost || 0);
      } else {
        resetForm();
      }
    }
  }, [visible, initialPart]);

  useEffect(() => {
    const qty = parseFloat(quantity) || 0;
    const cost = parseFloat(unitCost) || 0;
    setTotalCost(qty * cost);
  }, [quantity, unitCost]);

  const resetForm = () => {
    setMode('inventory');
    setPartName('');
    setProductId(undefined);
    setWarehouseId(undefined);
    setQuantity('1');
    setUnitCost('');
    setTotalCost(0);
  };

  const handleSave = () => {
    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost);

    if (!partName) {
      // Error handling ideally
      return;
    }

    if (mode === 'inventory' && !productId) {
      // Error
      return;
    }
    
    if (mode === 'inventory' && !warehouseId) {
        // Error
        return;
    }

    onSave({
      part_name: partName,
      product_id: mode === 'inventory' ? productId : undefined,
      warehouse_id: mode === 'inventory' ? warehouseId : undefined, // Or allow warehouse for manual if needed? Assuming manual is external purchase usually.
      quantity: qty || 0,
      unit_cost: cost || 0,
      total_cost: (qty || 0) * (cost || 0)
    });
    onDismiss();
  };

  const handleProductSelect = (product: Product) => {
    setProductId(product.id);
    setPartName(product.name);
    setUnitCost(String(product.cost || 0));
  };

  const selectedWarehouse = warehouses.find(w => w.id === warehouseId);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: '80%' }}>
        <Dialog.Title>{initialPart ? 'Editar Parte' : 'Agregar Parte'}</Dialog.Title>
        <Dialog.Content>
          <ScrollView>
            <View style={styles.row}>
              <Text>Origen:</Text>
              <RadioButton.Group onValueChange={value => setMode(value as 'inventory' | 'manual')} value={mode}>
                <View style={styles.radioRow}>
                  <RadioButton.Item label="Inventario" value="inventory" />
                  <RadioButton.Item label="Manual / Externo" value="manual" />
                </View>
              </RadioButton.Group>
            </View>

            <Divider style={styles.divider} />

            {mode === 'inventory' ? (
              <>
                <Text style={styles.label}>Buscar Producto</Text>
                <ProductSearch onSelect={handleProductSelect} />
                {productId && (
                    <Text style={styles.selectedProduct}>Seleccionado: {partName}</Text>
                )}
                
                <Text style={styles.label}>Almacén de Origen</Text>
                <Menu
                  visible={warehouseMenuVisible}
                  onDismiss={() => setWarehouseMenuVisible(false)}
                  anchor={
                    <Button 
                        mode="outlined" 
                        onPress={() => setWarehouseMenuVisible(true)}
                        style={styles.input}
                    >
                      {selectedWarehouse ? selectedWarehouse.name : "Seleccionar Almacén"}
                    </Button>
                  }
                >
                  {warehouses.map(w => (
                    <Menu.Item 
                        key={w.id} 
                        onPress={() => {
                            setWarehouseId(w.id);
                            setWarehouseMenuVisible(false);
                        }} 
                        title={w.name} 
                    />
                  ))}
                </Menu>
                {!warehouseId && <HelperText type="error">Requerido para deducción de stock</HelperText>}
              </>
            ) : (
              <TextInput
                label="Nombre de la parte / Descripción"
                value={partName}
                onChangeText={setPartName}
                mode="outlined"
                style={styles.input}
              />
            )}

            <View style={styles.rowInputs}>
              <TextInput
                label="Cantidad"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              <TextInput
                label="Costo Unitario"
                value={unitCost}
                onChangeText={setUnitCost}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <Text style={styles.total}>Total: ${totalCost.toFixed(2)}</Text>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancelar</Button>
          <Button onPress={handleSave} mode="contained">Guardar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 4,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white'
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedProduct: {
    marginBottom: 12,
    color: 'green',
    fontWeight: 'bold',
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 10,
  }
});
