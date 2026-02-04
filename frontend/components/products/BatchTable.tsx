import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Table, Column } from '../Table';
import { ProductBatch } from '../../services/productService';
import { Colors } from '../../constants/Colors';

interface BatchTableProps {
  batches: ProductBatch[];
  onEdit?: (batch: ProductBatch) => void;
  onDelete?: (batch: ProductBatch) => void; // Optional, depending on requirements
}

export function BatchTable({ batches, onEdit, onDelete }: BatchTableProps) {
  const columns: Column<ProductBatch>[] = [
    { key: 'batch_number', label: 'Batch #' },
    { key: 'quantity', label: 'Qty', numeric: true },
    { key: 'manufactured_date', label: 'Mfg Date' },
    { key: 'expiration_date', label: 'Exp Date' },
    {
      key: 'actions',
      label: 'Actions',
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
