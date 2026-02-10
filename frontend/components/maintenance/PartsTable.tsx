import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { DataTable, IconButton, Button, Text, useTheme } from 'react-native-paper';
import { MaintenancePart } from '../../types/maintenance';
import { Warehouse } from '../../services/warehouseService';
import { AddPartDialog } from './AddPartDialog';

interface Props {
  parts: MaintenancePart[];
  onChange: (parts: MaintenancePart[]) => void;
  readOnly?: boolean;
  warehouses: Warehouse[];
}

export function PartsTable({ parts, onChange, readOnly = false, warehouses = [] }: Props) {
  const theme = useTheme();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);

  const handleAdd = () => {
    setEditingIndex(undefined);
    setDialogVisible(true);
  };

  const handleEdit = (index: number) => {
    if (readOnly) return;
    setEditingIndex(index);
    setDialogVisible(true);
  };

  const handleSavePart = (part: MaintenancePart) => {
    const newParts = [...parts];
    if (editingIndex !== undefined) {
      newParts[editingIndex] = part;
    } else {
      newParts.push(part);
    }
    onChange(newParts);
  };

  const removePart = (index: number) => {
    const newParts = [...parts];
    newParts.splice(index, 1);
    onChange(newParts);
  };

  const getWarehouseName = (id?: number) => {
    if (!id) return '-';
    const w = warehouses.find(w => w.id === id);
    return w ? w.name : `ID: ${id}`;
  };

  const grandTotal = parts.reduce((sum, p) => sum + (p.total_cost || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium">Partes y Materiales</Text>
        {!readOnly && (
          <Button mode="text" icon="plus" onPress={handleAdd}>
            Agregar
          </Button>
        )}
      </View>

      <ScrollView horizontal contentContainerStyle={{minWidth: '100%'}}>
        <DataTable style={{ minWidth: 700 }}>
          <DataTable.Header>
            <DataTable.Title style={{ flex: 2 }}>Parte</DataTable.Title>
            <DataTable.Title style={{ flex: 1.5 }}>Almacén</DataTable.Title>
            <DataTable.Title numeric>Cant.</DataTable.Title>
            <DataTable.Title numeric>Costo U.</DataTable.Title>
            <DataTable.Title numeric>Total</DataTable.Title>
            {!readOnly && <DataTable.Title style={{ flex: 0.5 }}> </DataTable.Title>}
          </DataTable.Header>

          {parts.map((part, index) => (
            <DataTable.Row key={index} onPress={() => handleEdit(index)}>
              <DataTable.Cell style={{ flex: 2 }}>
                <View>
                    <Text style={{fontWeight: 'bold'}}>{part.part_name}</Text>
                    {part.product_id && <Text style={{fontSize: 10, color: 'gray'}}>Inv. SKU: {part.product_id}</Text>}
                </View>
              </DataTable.Cell>
              <DataTable.Cell style={{ flex: 1.5 }}>
                {getWarehouseName(part.warehouse_id)}
              </DataTable.Cell>
              <DataTable.Cell numeric>{part.quantity}</DataTable.Cell>
              <DataTable.Cell numeric>${part.unit_cost}</DataTable.Cell>
              <DataTable.Cell numeric>
                <Text style={{ fontWeight: 'bold' }}>${(part.total_cost || 0).toFixed(2)}</Text>
              </DataTable.Cell>
              {!readOnly && (
                <DataTable.Cell style={{ flex: 0.5 }}>
                  <IconButton icon="delete" size={20} onPress={() => removePart(index)} />
                </DataTable.Cell>
              )}
            </DataTable.Row>
          ))}
          
          <DataTable.Row>
            <DataTable.Cell style={{ flex: 2 }}><Text style={{fontWeight: 'bold'}}>Total Partes</Text></DataTable.Cell>
            <DataTable.Cell style={{ flex: 1.5 }}></DataTable.Cell>
            <DataTable.Cell numeric></DataTable.Cell>
            <DataTable.Cell numeric></DataTable.Cell>
            <DataTable.Cell numeric><Text style={{fontWeight: 'bold', color: theme.colors.primary}}>${grandTotal.toFixed(2)}</Text></DataTable.Cell>
            {!readOnly && <DataTable.Cell style={{ flex: 0.5 }}></DataTable.Cell>}
          </DataTable.Row>
        </DataTable>
      </ScrollView>

      <AddPartDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        onSave={handleSavePart}
        warehouses={warehouses}
        initialPart={editingIndex !== undefined ? parts[editingIndex] : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
});
