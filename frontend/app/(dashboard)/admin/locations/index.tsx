import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, Chip, Card, IconButton, SegmentedButtons, FAB, Menu, Button, Divider, List, Portal, Dialog, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { warehouseService, Warehouse, Location } from '../../../../services/warehouseService';
import { LocationTree } from '../../../../components/locations/LocationTree';
import { BatchCreateModal } from '../../../../components/locations/BatchCreateModal';
import { LocationEditDialog } from '../../../../components/locations/LocationEditDialog';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';

export default function LocationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [parentForNew, setParentForNew] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuLocation, setMenuLocation] = useState<Location | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateCode, setDuplicateCode] = useState('');

  const loadWarehouses = async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0]);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadLocations = async () => {
    if (!selectedWarehouse) return;
    
    setLoading(true);
    try {
      const data = await warehouseService.getLocationsTree(selectedWarehouse.id);
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      Toast.show({ type: 'error', text1: 'Error cargando ubicaciones' });
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLocations();
    setRefreshing(false);
  }, [selectedWarehouse]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      loadLocations();
    }
  }, [selectedWarehouse]);

  const handleAddChild = (parent: Location) => {
    setParentForNew(parent);
    setEditingLocation(null);
    setShowEditDialog(true);
  };

  const handleAddRoot = () => {
    setParentForNew(null);
    setEditingLocation(null);
    setShowEditDialog(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setParentForNew(null);
    setShowEditDialog(true);
  };

  const handleDelete = (location: Location) => {
    setDeletingLocation(location);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingLocation || !selectedWarehouse) return;
    
    try {
      await warehouseService.deleteLocation(selectedWarehouse.id, deletingLocation.id);
      Toast.show({ type: 'success', text1: 'Ubicación eliminada' });
      loadLocations();
    } catch (error: any) {
      console.error('Error deleting:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.detail || 'No se pudo eliminar',
      });
    }
    setShowDeleteDialog(false);
    setDeletingLocation(null);
  };

  const handleDuplicate = async () => {
    if (!menuLocation || !selectedWarehouse || !duplicateCode.trim()) return;
    
    try {
      await warehouseService.duplicateLocation(
        selectedWarehouse.id,
        menuLocation.id,
        duplicateCode.trim(),
        undefined
      );
      Toast.show({ type: 'success', text1: 'Ubicación duplicada' });
      loadLocations();
    } catch (error: any) {
      console.error('Error duplicating:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.detail || 'No se pudo duplicar',
      });
    }
    setShowDuplicateDialog(false);
    setMenuLocation(null);
    setDuplicateCode('');
    setMenuVisible(false);
  };

  const openMenu = (location: Location) => {
    setMenuLocation(location);
    setDuplicateCode(`${location.code}-COPY`);
    setMenuVisible(true);
  };

  const getLocationIcon = (type?: string) => {
    switch (type) {
      case 'zone': return 'map-marker-radius';
      case 'aisle': return 'road';
      case 'rack': return 'view-dashboard';
      case 'shelf': return 'layers-triple';
      case 'bin': return 'cube-outline';
      default: return 'map-marker';
    }
  };

  const locationStats = {
    total: locations.length || 0,
    zones: locations.filter(l => l.location_type === 'zone').length,
    aisles: locations.filter(l => l.location_type === 'aisle').length,
    racks: locations.filter(l => l.location_type === 'rack').length,
    bins: locations.filter(l => l.location_type === 'bin').length,
  };

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Gestión de Ubicaciones
        </Text>
        <View style={styles.headerActions}>
          <Button
            mode="outlined"
            icon="plus"
            onPress={handleAddRoot}
            disabled={!selectedWarehouse}
          >
            Nueva Ubicación
          </Button>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        {warehouses.map(w => (
          <Chip
            key={w.id}
            selected={selectedWarehouse?.id === w.id}
            onPress={() => setSelectedWarehouse(w)}
            style={styles.filterChip}
            icon="warehouse"
          >
            {w.name}
          </Chip>
        ))}
      </ScrollView>

      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
              {locationStats.total}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>Total</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
          <Card.Content style={styles.statContent}>
            <Text variant="titleMedium" style={{ color: '#2e7d32', fontWeight: 'bold' }}>{locationStats.zones}</Text>
            <Text variant="labelSmall" style={{ color: '#2e7d32' }}>Zonas</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
          <Card.Content style={styles.statContent}>
            <Text variant="titleMedium" style={{ color: '#1565c0', fontWeight: 'bold' }}>{locationStats.racks}</Text>
            <Text variant="labelSmall" style={{ color: '#1565c0' }}>Estanterías</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
          <Card.Content style={styles.statContent}>
            <Text variant="titleMedium" style={{ color: '#e65100', fontWeight: 'bold' }}>{locationStats.bins}</Text>
            <Text variant="labelSmall" style={{ color: '#e65100' }}>Contenedores</Text>
          </Card.Content>
        </Card>
      </View>

      {selectedWarehouse ? (
        <Card style={styles.treeCard}>
          <Card.Title
            title="Estructura de Ubicaciones"
            subtitle={`${selectedWarehouse.name} - ${locations.length} ubicaciones`}
            left={props => <IconButton {...props} icon="file-tree" />}
          />
          <Card.Content>
            {loading ? (
              <Text>Cargando...</Text>
            ) : locations.length === 0 ? (
              <View style={styles.emptyState}>
                <IconButton icon="map-marker-plus" size={48} />
                <Text variant="bodyLarge" style={{ color: Colors.gray }}>
                  No hay ubicaciones registradas
                </Text>
                <Text variant="bodySmall" style={{ color: Colors.gray }}>
                  Agrega una ubicación para comenzar
                </Text>
                <Button mode="contained" onPress={handleAddRoot} style={{ marginTop: 16 }}>
                  Crear primera ubicación
                </Button>
              </View>
            ) : (
              <LocationTree
                roots={locations}
                onAddChild={handleAddChild}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.treeCard}>
          <Card.Content>
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={{ color: Colors.gray }}>
                Selecciona un almacén para ver sus ubicaciones
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      <FAB.Group
        open={false}
        icon="plus"
        actions={[
          {
            icon: 'map-marker-plus',
            label: 'Nueva Ubicación',
            onPress: handleAddRoot,
          },
          {
            icon: '的一张',
            label: 'Crear en Lote',
            onPress: () => setShowBatchModal(true),
          },
        ]}
        onStateChange={() => {}}
        visible={!!selectedWarehouse}
        fabStyle={{ backgroundColor: theme.colors.primary }}
      />

      <BatchCreateModal
        visible={showBatchModal}
        onDismiss={() => setShowBatchModal(false)}
        onCreated={() => {
          setShowBatchModal(false);
          loadLocations();
        }}
        warehouseId={selectedWarehouse?.id || 0}
        parentLocation={parentForNew}
      />

      <LocationEditDialog
        visible={showEditDialog}
        onDismiss={() => {
          setShowEditDialog(false);
          setEditingLocation(null);
          setParentForNew(null);
        }}
        onSaved={() => {
          setShowEditDialog(false);
          loadLocations();
        }}
        warehouseId={selectedWarehouse?.id || 0}
        location={editingLocation}
        isNew={!editingLocation}
        parentId={parentForNew?.id}
      />

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Eliminar Ubicación</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro de eliminar "{deletingLocation?.name}" ({deletingLocation?.code})?
            </Text>
            <Text style={{ marginTop: 8, color: Colors.gray }}>
              Esta acción no se puede deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button onPress={confirmDelete} textColor={theme.colors.error}>Eliminar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showDuplicateDialog} onDismiss={() => setShowDuplicateDialog(false)}>
          <Dialog.Title>Duplicar Ubicación</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              Duplicando: {menuLocation?.code} - {menuLocation?.name}
            </Text>
            <TextInput
              label="Nuevo código"
              value={duplicateCode}
              onChangeText={setDuplicateCode}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDuplicateDialog(false)}>Cancelar</Button>
            <Button onPress={handleDuplicate}>Duplicar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  title: {
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.md,
  },
  filterChip: {
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 70,
  },
  statContent: {
    alignItems: 'center',
  },
  treeCard: {
    marginBottom: Layout.spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
});
