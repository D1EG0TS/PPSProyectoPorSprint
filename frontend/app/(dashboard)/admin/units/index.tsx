import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, IconButton, Portal, Modal, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getUnits, createUnit, updateUnit, deleteUnit, Unit } from '../../../../services/productService';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';
import { Input } from '../../../../components/Input';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';

export default function UnitManagementScreen() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const loadUnits = async () => {
    setLoading(true);
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar las unidades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleOpenModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setName(unit.name);
      setAbbreviation(unit.abbreviation);
    } else {
      setEditingUnit(null);
      setName('');
      setAbbreviation('');
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingUnit(null);
    setName('');
    setAbbreviation('');
  };

  const handleSave = async () => {
    if (!name.trim() || !abbreviation.trim()) {
      Alert.alert('Error', 'Nombre y abreviación son requeridos');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        abbreviation,
      };

      if (editingUnit) {
        await updateUnit(editingUnit.id, payload);
      } else {
        await createUnit(payload);
      }
      
      handleCloseModal();
      loadUnits();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Error al guardar la unidad');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (unit: Unit) => {
    Alert.alert(
      'Eliminar Unidad',
      `¿Estás seguro de eliminar "${unit.name}"? Esto podría afectar a los productos asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteUnit(unit.id);
              loadUnits();
            } catch (error: any) {
                console.error(error);
                Alert.alert('Error', error.response?.data?.detail || 'No se pudo eliminar la unidad');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Unit }) => (
    <Card
      title={item.name}
      subtitle={`Abreviación: ${item.abbreviation}`}
      footer={
        <View style={styles.cardActions}>
            <IconButton icon="pencil" size={20} onPress={() => handleOpenModal(item)} />
            <IconButton icon="delete" size={20} iconColor={Colors.error} onPress={() => handleDelete(item)} />
        </View>
      }
    >
      <View />
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Gestión de Unidades</Text>
      
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={units}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No hay unidades registradas</Text>}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => handleOpenModal()}
        label="Nueva Unidad"
      />

      <Portal>
        <Modal visible={modalVisible} onDismiss={handleCloseModal} contentContainerStyle={styles.modalContainer}>
          <Text variant="titleLarge" style={{ marginBottom: 16 }}>
            {editingUnit ? 'Editar Unidad' : 'Nueva Unidad'}
          </Text>
          
          <Input
            label="Nombre *"
            value={name}
            onChangeText={setName}
            containerStyle={styles.input}
          />
          
          <Input
            label="Abreviación *"
            value={abbreviation}
            onChangeText={setAbbreviation}
            placeholder="e.g. kg, m, u"
            containerStyle={styles.input}
          />

          <View style={styles.modalActions}>
            <Button variant="text" onPress={handleCloseModal} style={{ marginRight: 8 }}>Cancelar</Button>
            <Button variant="primary" onPress={handleSave} loading={saving} disabled={saving}>
              Guardar
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Layout.spacing.md,
  },
  title: {
    marginBottom: Layout.spacing.md,
    fontWeight: 'bold',
  },
  list: {
    paddingBottom: 80,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  fab: {
    position: 'absolute',
    margin: Layout.spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: Layout.borderRadius.md,
  },
  input: {
    marginBottom: Layout.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Layout.spacing.md,
  },
});
