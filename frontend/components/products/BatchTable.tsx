import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Table, Column } from '../Table';
import { ProductBatch } from '../../services/productService';
import { Colors } from '../../constants/Colors';

interface BatchTableProps {
  batches: ProductBatch[];
  onEdit?: (batch: ProductBatch) => void;
  onDelete?: (batchId: number) => void;
}

export function BatchTable({ batches, onEdit, onDelete }: BatchTableProps) {
  const columns: Column<ProductBatch>[] = [
    { key: 'batch_number', label: 'Lote' },
    { key: 'quantity', label: 'Cantidad', numeric: true },
    { key: 'manufactured_date', label: 'Fabricación' },
    { key: 'expiration_date', label: 'Caducidad' },
    {
      key: 'actions',
      label: 'Acciones',
      renderCell: (item) => (
        <View style={styles.actions}>
          {onEdit && (
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => onEdit(item)}
              iconColor={Colors.primary}
            />
          )}
          {onDelete && (
            <IconButton
              icon="delete"
              size={20}
              onPress={() => onDelete(item.id)}
              iconColor={Colors.danger}
            />
          )}
        </View>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={batches}
      keyExtractor={(item) => item.id.toString()}
      itemsPerPage={5}
    />
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
