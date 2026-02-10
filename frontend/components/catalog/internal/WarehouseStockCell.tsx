import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Portal, Modal, Button } from 'react-native-paper';
import { StockByWarehouse } from '../../../types/catalog';
import { Colors } from '../../../constants/Colors';
import { useRealTimeStock } from '../../../hooks/useRealTimeStock';
import { useAuth } from '../../../hooks/useAuth';

interface WarehouseStockCellProps {
  stocks: StockByWarehouse[];
  productId: number;
}

const WarehouseStockRow: React.FC<{ 
  productId: number; 
  warehouseId: number; 
  warehouseName: string;
  initialQuantity: number;
}> = ({ productId, warehouseId, warehouseName, initialQuantity }) => {
  const { user } = useAuth();
  const { stock } = useRealTimeStock(productId, warehouseId, undefined, 0, user?.id);
  const currentStock = stock !== null ? stock : initialQuantity;

  return (
    <View style={styles.row}>
      <Text>{warehouseName}</Text>
      <Text style={{ fontWeight: 'bold' }}>{currentStock}</Text>
    </View>
  );
};

export const WarehouseStockCell: React.FC<WarehouseStockCellProps> = ({ stocks, productId }) => {
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();
  
  // Get global stock for the summary
  const { stock: globalStock } = useRealTimeStock(productId, undefined, undefined, 0, user?.id);

  if (!stocks || stocks.length === 0) {
    return <Text style={styles.empty}>-</Text>;
  }

  // If only one, show it directly (but with real-time update)
  if (stocks.length === 1) {
    // We can reuse the Row logic but styled as plain text
    // Or just use the globalStock since there is only 1 warehouse
    const displayStock = globalStock !== null ? globalStock : stocks[0].quantity;
    return (
      <Text style={styles.text}>
        {stocks[0].warehouse_name}: {displayStock}
      </Text>
    );
  }

  // If multiple, show total and a button
  const initialTotal = stocks.reduce((acc, s) => acc + s.quantity, 0);
  const displayTotal = globalStock !== null ? globalStock : initialTotal;

  return (
    <View>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <Text style={[styles.text, styles.link]}>
          {displayTotal} in {stocks.length} warehouses
        </Text>
      </TouchableOpacity>

      <Portal>
        <Modal 
          visible={visible} 
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>Stock Breakdown</Text>
          {stocks.map(s => (
            <WarehouseStockRow 
              key={s.warehouse_id}
              productId={productId}
              warehouseId={s.warehouse_id}
              warehouseName={s.warehouse_name}
              initialQuantity={s.quantity}
            />
          ))}
          <Button onPress={() => setVisible(false)} style={{ marginTop: 10 }}>
            Close
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
  },
  empty: {
    color: '#999',
    fontSize: 12,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  }
});
