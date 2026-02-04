import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, IconButton, List, useTheme, FAB } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { warehouseService, Location, Warehouse } from '../../../../../services/warehouseService';
import { Modal } from '../../../../../components/Modal';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import { FormGroup } from '../../../../../components/FormGroup';
import { Colors } from '../../../../../constants/Colors';
import Toast from 'react-native-toast-message';

// Recursive Tree Node Component
const LocationNode = ({ 
  node, 
  level = 0, 
  onAddChild, 
  onEdit, 
  onDelete 
}: { 
  node: Location; 
  level?: number; 
  onAddChild: (node: Location) => void; 
  onEdit: (node: Location) => void; 
  onDelete: (node: Location) => void; 
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
            iconColor={theme.colors.error} 
            onPress={() => onDelete(node)} 
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
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [warehouseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [whData, locsData] = await Promise.all([
        warehouseService.getWarehouse(warehouseId),
        warehouseService.getLocations(warehouseId)
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
    setFormData({ code: '', name: '' });
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenCreateChild = (parent: Location) => {
    setModalMode('create');
    setSelectedParent(parent);
    setEditingLocation(null);
    setFormData({ code: '', name: '' });
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenEdit = (location: Location) => {
    setModalMode('edit');
    setSelectedParent(null); // Parent doesn't change on edit
    setEditingLocation(location);
    setFormData({ code: location.code, name: location.name });
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
      if (modalMode === 'create') {
        await warehouseService.createLocation(warehouseId, {
          code: formData.code,
          name: formData.name,
          parent_location_id: selectedParent?.id
        });
        Toast.show({ type: 'success', text1: 'Ubicación creada' });
      } else if (modalMode === 'edit' && editingLocation) {
        await warehouseService.updateLocation(warehouseId, editingLocation.id, {
          code: formData.code,
          name: formData.name
        });
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
            <Button mode="contained" onPress={handleOpenCreateRoot} style={styles.emptyButton}>
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
            />
          ))
        )}
        {locations.length > 0 && <View style={{ height: 80 }} />}
      </ScrollView>

      {locations.length > 0 && (
        <FAB
          icon="plus"
          label="Nueva Raíz"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={handleOpenCreateRoot}
          color="white"
        />
      )}

      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        title={modalMode === 'create' 
          ? (selectedParent ? `Nueva Sub-ubicación en ${selectedParent.code}` : 'Nueva Ubicación Raíz') 
          : 'Editar Ubicación'}
      >
        <FormGroup label="Código" error={errors.code}>
          <Input
            value={formData.code}
            onChangeText={(text) => setFormData({ ...formData, code: text })}
            placeholder="Ej. A-01, ESTANTE-1"
            autoCapitalize="characters"
          />
        </FormGroup>

        <FormGroup label="Nombre" error={errors.name}>
          <Input
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Ej. Pasillo A, Estantería Principal"
          />
        </FormGroup>

        <View style={styles.modalActions}>
          <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1, marginRight: 8 }}>
            Cancelar
          </Button>
          <Button mode="contained" onPress={handleSave} loading={saving} style={{ flex: 1 }}>
            Guardar
          </Button>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyButton: {
    marginTop: 16,
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
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
