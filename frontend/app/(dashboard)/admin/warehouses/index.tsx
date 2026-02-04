import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, IconButton, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Table } from '../../../../components/Table';
import { Button } from '../../../../components/Button';
import { warehouseService, Warehouse } from '../../../../services/warehouseService';
import { useAuth } from '../../../../hooks/useAuth';
import { USER_ROLES } from '../../../../constants/roles';

export default function WarehousesListScreen() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Error loading warehouses:', error);
      Alert.alert('Error', 'No se pudieron cargar los almacenes');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadWarehouses();
    }, [])
  );

  const handleDelete = (warehouse: Warehouse) => {
    Alert.alert(
      'Confirmar desactivación',
      `¿Estás seguro de que deseas desactivar el almacén "${warehouse.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await warehouseService.deleteWarehouse(warehouse.id);
              loadWarehouses();
            } catch (error) {
              console.error('Error deleting warehouse:', error);
              Alert.alert('Error', 'No se pudo desactivar el almacén');
            }
          },
        },
      ]
    );
  };

  const columns = [
    { key: 'code', label: 'Código' },
    { key: 'name', label: 'Nombre' },
    { key: 'location', label: 'Ubicación Física' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Acciones' },
  ];

  // Custom renderer for table rows if Table component supports it, 
  // but looking at Table.tsx it seems it just renders text?
  // Let's check Table.tsx again.
  // It uses keyExtractor and displays data. 
  // It doesn't seem to support custom cell rendering in the snippet I saw.
  // I might need to update Table component or just map data to strings?
  // But I need buttons for actions.
  // Let's check Table.tsx content again to be sure.
  
  // If Table doesn't support custom cells, I might need to implement a simple list or update Table.
  // Let's assume for now I need to update Table or build a custom list.
  // But wait, I can just render a View with map for now if Table is too simple.
  // Or I can update Table.tsx to support `renderCell`.
  
  // Let's stick to a simple View mapping first to be safe and fast, 
  // or check if I can modify Table.tsx quickly.
  // I'll check Table.tsx fully first.
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Gestión de Almacenes</Text>
        <Button 
          mode="contained" 
          icon="plus" 
          onPress={() => router.push('/(dashboard)/admin/warehouses/create')}
        >
          Crear Almacén
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <View style={styles.listContainer}>
             {/* Simple header */}
             <View style={[styles.row, styles.headerRow, { backgroundColor: theme.colors.elevation.level1 }]}>
                <Text style={[styles.cell, { flex: 1, fontWeight: 'bold' }]}>Código</Text>
                <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>Nombre</Text>
                <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>Ubicación</Text>
                <Text style={[styles.cell, { flex: 1, fontWeight: 'bold' }]}>Estado</Text>
                <Text style={[styles.cell, { flex: 1.5, fontWeight: 'bold' }]}>Acciones</Text>
             </View>

             {warehouses.map((wh) => (
               <View key={wh.id} style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
                  <Text style={[styles.cell, { flex: 1 }]}>{wh.code}</Text>
                  <Text style={[styles.cell, { flex: 2 }]}>{wh.name}</Text>
                  <Text style={[styles.cell, { flex: 2 }]}>{wh.location || '-'}</Text>
                  <View style={[styles.cell, { flex: 1 }]}>
                    <Chip 
                        compact 
                        mode="outlined" 
                        style={{ backgroundColor: wh.is_active ? '#E8F5E9' : '#FFEBEE' }}
                        textStyle={{ color: wh.is_active ? '#2E7D32' : '#C62828', fontSize: 10 }}
                    >
                        {wh.is_active ? 'Activo' : 'Inactivo'}
                    </Chip>
                  </View>
                  <View style={[styles.cell, { flex: 1.5, flexDirection: 'row' }]}>
                      <IconButton 
                        icon="pencil" 
                        size={20} 
                        onPress={() => router.push(`/(dashboard)/admin/warehouses/${wh.id}/edit`)}
                      />
                      <IconButton 
                        icon="file-tree" 
                        size={20} 
                        onPress={() => router.push(`/(dashboard)/admin/warehouses/${wh.id}/locations`)}
                      />
                      {wh.is_active && (
                        <IconButton 
                            icon="delete" 
                            size={20} 
                            iconColor={theme.colors.error}
                            onPress={() => handleDelete(wh)}
                        />
                      )}
                  </View>
               </View>
             ))}
             
             {warehouses.length === 0 && (
                <Text style={{ padding: 20, textAlign: 'center' }}>No hay almacenes registrados</Text>
             )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  loader: {
    marginTop: 50,
  },
  listContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    borderBottomWidth: 2,
  },
  cell: {
    paddingHorizontal: 4,
  }
});
