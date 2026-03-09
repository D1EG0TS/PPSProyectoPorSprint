import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, IconButton, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Table, Column } from '../../../../components/Table';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { warehouseService, Warehouse } from '../../../../services/warehouseService';
import { useAuth } from '../../../../hooks/useAuth';
import { usePermission } from '../../../../hooks/usePermission';
import { AccessDenied } from '../../../../components/AccessDenied';
import { Layout } from '../../../../constants/Layout';
import { Colors } from '../../../../constants/Colors';

export default function WarehousesListScreen() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const { hasPermission } = usePermission();

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
      if (hasPermission('warehouses:view')) {
        loadWarehouses();
      }
    }, [hasPermission])
  );

  if (!hasPermission('warehouses:view')) {
    return <AccessDenied />;
  }

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

  const renderWarehouseCard = (wh: Warehouse) => (
    <Card
      title={wh.name}
      subtitle={`Código: ${wh.code}`}
      footer={
        <View style={styles.cardActions}>
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
      }
    >
      <View style={styles.cardContent}>
        <Text variant="bodyMedium">Ubicación: {wh.location || '-'}</Text>
        <Chip 
            compact 
            mode="outlined" 
            style={{ backgroundColor: wh.is_active ? Colors.success + '20' : Colors.error + '20', alignSelf: 'flex-start' }}
            textStyle={{ color: wh.is_active ? Colors.success : Colors.error, fontSize: 10 }}
        >
            {wh.is_active ? 'Activo' : 'Inactivo'}
        </Chip>
      </View>
    </Card>
  );

  const columns: Column<Warehouse>[] = [
    { key: 'code', label: 'Código', width: 80 },
    { key: 'name', label: 'Nombre', flex: 2 },
    { key: 'location', label: 'Ubicación', flex: 2, renderCell: (w) => <Text>{w.location || '-'}</Text> },
    { 
        key: 'is_active', 
        label: 'Estado', 
        width: 100,
        renderCell: (w) => (
            <Chip 
                compact 
                mode="outlined" 
                style={{ backgroundColor: w.is_active ? Colors.success + '20' : Colors.error + '20' }}
                textStyle={{ color: w.is_active ? Colors.success : Colors.error, fontSize: 10 }}
            >
                {w.is_active ? 'Activo' : 'Inactivo'}
            </Chip>
        )
    },
    {
        key: 'actions',
        label: 'Acciones',
        width: 120,
        renderCell: (wh) => (
            <View style={styles.actions}>
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
        )
    }
  ];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>Gestión de Almacenes</Text>
        {hasPermission('warehouses:manage') && (
          <Button 
            variant="primary" 
            icon="plus" 
            onPress={() => router.push('/(dashboard)/admin/warehouses/create')}
          >
            Crear Almacén
          </Button>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />
      ) : (
        <Table
          columns={columns}
          data={warehouses}
          keyExtractor={(item) => item.id.toString()}
          itemsPerPage={10}
          emptyMessage="No hay almacenes registrados"
          renderCard={renderWarehouseCard}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  loader: {
    marginTop: 50,
  },
  actions: {
    flexDirection: 'row',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardContent: {
    gap: 8,
  },
});
