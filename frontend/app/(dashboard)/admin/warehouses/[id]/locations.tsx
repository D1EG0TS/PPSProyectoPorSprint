import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton, useTheme, FAB, Portal, Modal as PaperModal } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { warehouseService, Location, Warehouse } from '../../../../../services/warehouseService';
import { locationService } from '../../../../../services/locationService';
import { Product } from '../../../../../services/productService';
import { ProductSearch } from '../../../../../components/products/ProductSearch';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import { Colors } from '../../../../../constants/Colors';
import { Layout } from '../../../../../constants/Layout';
import Toast from 'react-native-toast-message';

// Recursive Tree Node Component
const LocationNode = ({ 
  node, 
  level = 0, 
  onAddChild, 
  onEdit, 
  onDelete, 
  onAssignProduct
}: { 
  node: Location; 
  level?: number; 
  onAddChild: (node: Location) => void; 
  onEdit: (node: Location) => void; 
  onDelete: (node: Location) => void; 
  onAssignProduct: (node: Location) => void;
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <View>
      <View style={[styles.nodeContainer, { paddingLeft: level * 20 }]}>
        <TouchableOpacity 
          style={styles.nodeContent} 
          onPress={() => setExpanded(!expanded)}
          disabled={!hasChildren}
        >
          <View style={styles.nodeIcon}>
            {hasChildren && (
              <IconButton 
                icon={expanded ? "chevron-down" : "chevron-right"} 
                size={20} 
                onPress={() => setExpanded(!expanded)} 
              />
            )}
            {!hasChildren && <View style={{ width: 36 }} />}
          </View>
          <View style={styles.nodeTextContainer}>
            <Text variant="bodyLarge" style={styles.nodeName}>{node.name}</Text>
            <Text variant="bodySmall" style={styles.nodeCode}>{node.code}</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.nodeActions}>
          <IconButton icon="plus" size={18} onPress={() => onAddChild(node)} />
          <IconButton icon="pencil" size={18} onPress={() => onEdit(node)} />
          <IconButton 
            icon="delete" 
            size={18} 
            iconColor={Colors.error} 
            onPress={() => onDelete(node)} 
          />
          <IconButton 
            icon="cube-outline" 
            size={18} 
            onPress={() => onAssignProduct(node)} 
          />
        </View>
      </View>
      
      {expanded && hasChildren && node.children && (
        <View>
          {node.children.map((child) => (
            <LocationNode 
              key={child.id} 
              node={child} 
              level={level + 1} 
              onAddChild={onAddChild} 
              onEdit={onEdit} 
              onDelete={onDelete} 
              onAssignProduct={onAssignProduct}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function WarehouseLocationsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const warehouseId = parseInt(id as string);

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedParent, setSelectedParent] = useState<Location | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ 
    code: '', 
    name: '',
    aisle: '',
    rack: '',
    shelf: '',
    position: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [assignVisible, setAssignVisible] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Location | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [assignQty, setAssignQty] = useState<string>('1');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignInventory, setAssignInventory] = useState<any[]>([]);
  const [assignInvLoading, setAssignInvLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [warehouseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [whData, locsData] = await Promise.all([
        warehouseService.getWarehouse(warehouseId),
        warehouseService.getLocationsTree(warehouseId)
      ]);
      setWarehouse(whData);
      setLocations(locsData);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los datos del almacén',
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateRoot = () => {
    setModalMode('create');
    setSelectedParent(null);
    setEditingLocation(null);
    setFormData({ 
      code: '', 
      name: '',
      aisle: '',
      rack: '',
      shelf: '',
      position: ''
    });
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenCreateChild = (parent: Location) => {
    setModalMode('create');
    setSelectedParent(parent);
    setEditingLocation(null);
    setFormData({ 
      code: '', 
      name: '',
      aisle: '',
      rack: '',
      shelf: '',
      position: ''
    });
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenEdit = (location: Location) => {
    setModalMode('edit');
    setSelectedParent(null); // Parent doesn't change on edit
    setEditingLocation(location);
    setFormData({ 
      code: location.code, 
      name: location.name,
      aisle: location.aisle || '',
      rack: location.rack || '',
      shelf: location.shelf || '',
      position: location.position || ''
    });
    setErrors({});
    setModalVisible(true);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code) newErrors.code = 'El código es requerido';
    if (!formData.name) newErrors.name = 'El nombre es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    try {
      setSaving(true);
      const commonData = {
        code: formData.code,
        name: formData.name,
        aisle: formData.aisle || undefined,
        rack: formData.rack || undefined,
        shelf: formData.shelf || undefined,
        position: formData.position || undefined,
      };

      if (modalMode === 'create') {
        await warehouseService.createLocation(warehouseId, {
          ...commonData,
          parent_location_id: selectedParent?.id
        });
        Toast.show({ type: 'success', text1: 'Ubicación creada' });
      } else if (modalMode === 'edit' && editingLocation) {
        await warehouseService.updateLocation(warehouseId, editingLocation.id, commonData);
        Toast.show({ type: 'success', text1: 'Ubicación actualizada' });
      }
      setModalVisible(false);
      fetchData(); // Refresh tree
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Error al guardar';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (location: Location) => {
    if (location.children && location.children.length > 0) {
      Alert.alert('No se puede eliminar', 'La ubicación tiene sub-ubicaciones. Elimínelas primero.');
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Eliminar ubicación "${location.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await warehouseService.deleteLocation(warehouseId, location.id);
              Toast.show({ type: 'success', text1: 'Ubicación eliminada' });
              fetchData();
            } catch (error: any) {
              const msg = error.response?.data?.detail || 'Error al eliminar';
              Toast.show({ type: 'error', text1: 'Error', text2: msg });
            }
          } 
        }
      ]
    );
  };

  const openAssignProduct = (location: Location) => {
    setAssignTarget(location);
    setSelectedProduct(null);
    setAssignQty('1');
    setAssignVisible(true);
  };

  const loadAssignInventory = async (locationId?: number) => {
    if (!locationId) return;
    try {
      setAssignInvLoading(true);
      const data = await locationService.getInventory(locationId);
      setAssignInventory(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAssignInvLoading(false);
    }
  };

  React.useEffect(() => {
    if (assignTarget?.id && assignVisible) {
      loadAssignInventory(assignTarget.id);
    }
  }, [assignTarget, assignVisible]);
  const handleAssignProduct = async () => {
    if (!assignTarget || !selectedProduct) {
      Toast.show({ type: 'error', text1: 'Selecciona ubicación y producto' });
      return;
    }
    const qty = parseInt(assignQty);
    if (!qty || qty <= 0) {
      Toast.show({ type: 'error', text1: 'Cantidad inválida' });
      return;
    }
    try {
      setAssignSaving(true);
      await locationService.assignProduct(selectedProduct.id, {
        location_id: assignTarget.id,
        warehouse_id: warehouseId,
        quantity: qty,
        assignment_type: 'manual',
      });
      Toast.show({ type: 'success', text1: 'Producto asignado' });
      setAssignVisible(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Error al asignar';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setAssignSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <View>
          <Text variant="titleLarge">Ubicaciones</Text>
          <Text variant="bodyMedium" style={{ color: Colors.gray }}>{warehouse?.name} ({warehouse?.code})</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {locations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ color: Colors.gray }}>No hay ubicaciones registradas.</Text>
            <Button variant="primary" onPress={handleOpenCreateRoot} style={styles.emptyButton}>
              Crear Ubicación Raíz
            </Button>
          </View>
        ) : (
          locations.map(node => (
            <LocationNode 
              key={node.id} 
              node={node} 
              onAddChild={handleOpenCreateChild} 
              onEdit={handleOpenEdit} 
            onDelete={handleDelete} 
            onAssignProduct={openAssignProduct}
            />
          ))
        )}
        {locations.length > 0 && <View style={{ height: 80 }} />}
      </ScrollView>

      {locations.length > 0 && (
        <FAB
          icon="plus"
          label="Nueva Raíz"
          style={[styles.fab, { backgroundColor: Colors.primary }]}
          onPress={handleOpenCreateRoot}
          color="white"
        />
      )}

      <Portal>
        <PaperModal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {modalMode === 'create' 
              ? (selectedParent ? `Nueva Sub-ubicación en ${selectedParent.code}` : 'Nueva Ubicación Raíz') 
              : 'Editar Ubicación'}
          </Text>

          <Input
            label="Código *"
            value={formData.code}
            onChangeText={(text) => setFormData({ ...formData, code: text })}
            placeholder="Ej. A-01, ESTANTE-1"
            autoCapitalize="characters"
            error={errors.code}
            containerStyle={styles.input}
          />

          <Input
            label="Nombre *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Ej. Pasillo A, Estantería Principal"
            error={errors.name}
            containerStyle={styles.input}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Pasillo"
                value={formData.aisle}
                onChangeText={(text) => setFormData({ ...formData, aisle: text })}
                placeholder="Ej. A"
                containerStyle={styles.input}
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Rack (Estante)"
                value={formData.rack}
                onChangeText={(text) => setFormData({ ...formData, rack: text })}
                placeholder="Ej. 1"
                containerStyle={styles.input}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Fila (Nivel)"
                value={formData.shelf}
                onChangeText={(text) => setFormData({ ...formData, shelf: text })}
                placeholder="Ej. 1"
                containerStyle={styles.input}
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Posición (Columna)"
                value={formData.position}
                onChangeText={(text) => setFormData({ ...formData, position: text })}
                placeholder="Ej. 1"
                containerStyle={styles.input}
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1, marginRight: 8 }}>
              Cancelar
            </Button>
            <Button variant="primary" onPress={handleSave} loading={saving} style={{ flex: 1 }}>
              Guardar
            </Button>
          </View>
        </PaperModal>
        <PaperModal
          visible={assignVisible}
          onDismiss={() => setAssignVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Asignar Producto a {assignTarget?.code}
          </Text>

          <View style={{ marginBottom: Layout.spacing.md }}>
            <ProductSearch 
              onSelect={(p) => setSelectedProduct(p)} 
              label="Buscar Producto"
              placeholder="SKU, Nombre o Código"
            />
            {selectedProduct && (
              <Text style={{ color: Colors.gray }}>
                Seleccionado: {selectedProduct.name} (SKU: {selectedProduct.sku})
              </Text>
            )}
          </View>

          <Input
            label="Cantidad *"
            value={assignQty}
            onChangeText={setAssignQty}
            keyboardType="numeric"
            containerStyle={styles.input}
          />

          <View style={{ marginTop: Layout.spacing.md }}>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>Inventario por ubicación</Text>
            {assignInvLoading ? (
              <ActivityIndicator />
            ) : assignInventory.length === 0 ? (
              <Text style={{ color: Colors.gray }}>No hay productos asignados en este contenedor.</Text>
            ) : (
              <View>
                {assignInventory.map((it) => (
                  <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Text>{it.product?.name || `Producto #${it.product_id}`}</Text>
                    <Text style={{ color: Colors.gray }}>Qty: {it.quantity}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Button variant="outline" icon="refresh" onPress={() => loadAssignInventory(assignTarget?.id)}>
                    Refrescar
                  </Button>
                </View>
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <Button variant="outline" onPress={() => setAssignVisible(false)} style={{ flex: 1, marginRight: 8 }}>
              Cancelar
            </Button>
            <Button variant="primary" onPress={handleAssignProduct} loading={assignSaving} style={{ flex: 1 }}>
              Asignar
            </Button>
          </View>
        </PaperModal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: {
    flex: 1,
    padding: Layout.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyButton: {
    marginTop: Layout.spacing.md,
  },
  nodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 56,
  },
  nodeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  nodeIcon: {
    marginRight: 8,
  },
  nodeTextContainer: {
    flex: 1,
  },
  nodeName: {
    fontWeight: '500',
  },
  nodeCode: {
    color: Colors.gray,
    fontSize: 12,
  },
  nodeActions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    margin: Layout.spacing.md,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: Layout.spacing.lg,
    padding: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
  },
  modalTitle: {
    marginBottom: Layout.spacing.lg,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: Layout.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: Layout.spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  col: {
    flex: 1,
    paddingHorizontal: 8,
  },
});
