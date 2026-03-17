import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, IconButton, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Table, Column } from '../../../../components/Table';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { warehouseService, Warehouse, Location } from '../../../../services/warehouseService';
import { LocationTree } from '../../../../components/locations/LocationTree';
import { Input } from '../../../../components/Input';
import { useAuth } from '../../../../hooks/useAuth';
import { usePermission } from '../../../../hooks/usePermission';
import { AccessDenied } from '../../../../components/AccessDenied';
import { Layout } from '../../../../constants/Layout';
import { Colors } from '../../../../constants/Colors';

export default function WarehousesListScreen() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locForm, setLocForm] = useState({ code: '', name: '', aisle: '', rack: '', shelf: '', position: '' });
  const [locErrors, setLocErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const { hasPermission } = usePermission();

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
      if (!selectedWarehouse && data.length > 0) {
        setSelectedWarehouse(data[0]);
      }
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

  const loadLocations = async (wh: Warehouse | null) => {
    if (!wh) return;
    try {
      setLocLoading(true);
      const data = await warehouseService.getLocationsTree(wh.id);
      setLocations(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo cargar el árbol de ubicaciones');
    } finally {
      setLocLoading(false);
    }
  };

  const validateLocationForm = () => {
    const errs: Record<string, string> = {};
    if (!locForm.code) errs.code = 'Código requerido';
    if (!locForm.name) errs.name = 'Nombre requerido';
    setLocErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateRootLocation = async () => {
    if (!selectedWarehouse) return;
    if (!validateLocationForm()) return;
    try {
      await warehouseService.createLocation(selectedWarehouse.id, {
        code: locForm.code,
        name: locForm.name,
        aisle: locForm.aisle || undefined,
        rack: locForm.rack || undefined,
        shelf: locForm.shelf || undefined,
        position: locForm.position || undefined,
      });
      setLocForm({ code: '', name: '', aisle: '', rack: '', shelf: '', position: '' });
      loadLocations(selectedWarehouse);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Error al crear ubicación';
      Alert.alert('Error', msg);
    }
  };

  const handleAddChild = async (parent: Location) => {
    if (!selectedWarehouse) return;
    // Reutilizamos el formulario actual para añadir hijo con parent_location_id
    if (!validateLocationForm()) return;
    try {
      await warehouseService.createLocation(selectedWarehouse.id, {
        code: locForm.code,
        name: locForm.name,
        aisle: locForm.aisle || undefined,
        rack: locForm.rack || undefined,
        shelf: locForm.shelf || undefined,
        position: locForm.position || undefined,
        parent_location_id: parent.id,
      });
      setLocForm({ code: '', name: '', aisle: '', rack: '', shelf: '', position: '' });
      loadLocations(selectedWarehouse);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Error al crear sub-ubicación';
      Alert.alert('Error', msg);
    }
  };

  const handleEditLocation = (loc: Location) => {
    // Navegar a pantalla dedicada para edición detallada
    if (selectedWarehouse) {
      router.push(`/(dashboard)/admin/warehouses/${selectedWarehouse.id}/locations`);
    }
  };

  const handleDeleteLocation = async (loc: Location) => {
    if (!selectedWarehouse) return;
    try {
      await warehouseService.deleteLocation(selectedWarehouse.id, loc.id);
      loadLocations(selectedWarehouse);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Error al eliminar ubicación';
      Alert.alert('Error', msg);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (selectedWarehouse) {
        loadLocations(selectedWarehouse);
      }
    }, [selectedWarehouse])
  );

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

      {/* Panel integrado de Ubicaciones */}
      {selectedWarehouse && (
        <View style={styles.locationsPanel}>
          <View style={styles.locationsHeader}>
            <Text variant="titleLarge">Ubicaciones: {selectedWarehouse.name}</Text>
            <View style={{ flexDirection: 'row' }}>
              <Button 
                variant="outline" 
                icon="refresh" 
                onPress={() => loadLocations(selectedWarehouse)} 
                style={{ marginRight: 8 }}
              >
                Refrescar
              </Button>
              <Button 
                variant="primary" 
                icon="file-tree" 
                onPress={() => router.push(`/(dashboard)/admin/warehouses/${selectedWarehouse.id}/locations`)}
              >
                Abrir Vista Completa
              </Button>
            </View>
          </View>

          <View style={styles.locationsContent}>
            <View style={styles.locationsForm}>
              <Text variant="titleMedium" style={{ marginBottom: 8 }}>Crear Ubicación</Text>
              <Input
                label="Código *"
                value={locForm.code}
                onChangeText={(text) => setLocForm({ ...locForm, code: text })}
                autoCapitalize="characters"
                error={locErrors.code}
                containerStyle={{ marginBottom: 8 }}
              />
              <Input
                label="Nombre *"
                value={locForm.name}
                onChangeText={(text) => setLocForm({ ...locForm, name: text })}
                error={locErrors.name}
                containerStyle={{ marginBottom: 8 }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Pasillo"
                    value={locForm.aisle}
                    onChangeText={(text) => setLocForm({ ...locForm, aisle: text })}
                    containerStyle={{ marginBottom: 8 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Rack"
                    value={locForm.rack}
                    onChangeText={(text) => setLocForm({ ...locForm, rack: text })}
                    containerStyle={{ marginBottom: 8 }}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Fila"
                    value={locForm.shelf}
                    onChangeText={(text) => setLocForm({ ...locForm, shelf: text })}
                    containerStyle={{ marginBottom: 8 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Posición"
                    value={locForm.position}
                    onChangeText={(text) => setLocForm({ ...locForm, position: text })}
                    containerStyle={{ marginBottom: 8 }}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Button variant="primary" icon="plus" onPress={handleCreateRootLocation}>
                  Crear Ubicación Raíz
                </Button>
              </View>
            </View>
            <View style={styles.locationsTree}>
              {locLoading ? (
                <ActivityIndicator />
              ) : (
                <LocationTree 
                  roots={locations}
                  onAddChild={handleAddChild}
                  onEdit={handleEditLocation}
                  onDelete={handleDeleteLocation}
                />
              )}
            </View>
          </View>
        </View>
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
  locationsPanel: {
    marginTop: Layout.spacing.lg,
    padding: Layout.spacing.md,
    backgroundColor: 'white',
    borderRadius: Layout.borderRadius.md,
  },
  locationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  locationsContent: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  locationsForm: {
    flex: 1,
  },
  locationsTree: {
    flex: 2,
  },
});
