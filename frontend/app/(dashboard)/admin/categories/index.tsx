import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView } from 'react-native';
import { Text, FAB, Card, IconButton, Portal, Modal, TextInput, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from '../../../../services/productService';
import { Colors } from '../../../../constants/Colors';

export default function CategoryManagementScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [showParentMenu, setShowParentMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setDescription(category.description || '');
      setParentId(category.parent_id ? category.parent_id.toString() : null);
    } else {
      setEditingCategory(null);
      setName('');
      setDescription('');
      setParentId(null);
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingCategory(null);
    setName('');
    setDescription('');
    setParentId(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        parent_id: parentId ? parseInt(parentId) : undefined,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await createCategory(payload);
      }
      
      handleCloseModal();
      loadCategories();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.detail || 'Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Eliminar Categoría',
      `¿Estás seguro de eliminar "${category.name}"? Esto podría afectar a los productos asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteCategory(category.id);
              loadCategories();
            } catch (error: any) {
                console.error(error);
                Alert.alert('Error', error.response?.data?.detail || 'No se pudo eliminar la categoría');
            }
          }
        }
      ]
    );
  };

  const getParentName = (pid?: number) => {
    if (!pid) return '';
    const parent = categories.find(c => c.id === pid);
    return parent ? parent.name : 'Desconocido';
  };

  const renderItem = ({ item }: { item: Category }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content style={styles.cardContent}>
        <View style={{ flex: 1 }}>
            <Text variant="titleMedium">{item.name}</Text>
            {item.description ? <Text variant="bodySmall">{item.description}</Text> : null}
            {item.parent_id ? (
                <Text variant="labelSmall" style={{ color: Colors.primary }}>
                    Subcategoría de: {getParentName(item.parent_id)}
                </Text>
            ) : (
                <Text variant="labelSmall" style={{ color: Colors.textSecondary }}>Categoría Principal</Text>
            )}
        </View>
        <View style={styles.actions}>
            <IconButton icon="pencil" size={20} onPress={() => handleOpenModal(item)} />
            <IconButton icon="delete" size={20} iconColor={Colors.error} onPress={() => handleDelete(item)} />
        </View>
      </Card.Content>
    </Card>
  );

  // Filter potential parents: exclude self and children (simplified: just exclude self for now)
  const availableParents = categories.filter(c => 
    !c.parent_id && (editingCategory ? c.id !== editingCategory.id : true)
  );

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Gestión de Categorías</Text>
      
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No hay categorías registradas</Text>}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => handleOpenModal()}
        label="Nueva Categoría"
      />

      <Portal>
        <Modal visible={modalVisible} onDismiss={handleCloseModal} contentContainerStyle={styles.modalContainer}>
          <Text variant="titleLarge" style={{ marginBottom: 16 }}>
            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          </Text>
          
          <TextInput
            label="Nombre *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.input}>
            <Menu
                visible={showParentMenu}
                onDismiss={() => setShowParentMenu(false)}
                anchor={
                <Button mode="outlined" onPress={() => setShowParentMenu(true)} contentStyle={{ justifyContent: 'flex-start' }}>
                    {parentId ? `Padre: ${getParentName(parseInt(parentId))}` : 'Categoría Padre (Opcional)'}
                </Button>
                }
            >
                <Menu.Item onPress={() => { setParentId(null); setShowParentMenu(false); }} title="(Ninguna)" />
                <Divider />
                {availableParents.map((cat) => (
                    <Menu.Item 
                        key={cat.id} 
                        onPress={() => { setParentId(cat.id.toString()); setShowParentMenu(false); }} 
                        title={cat.name} 
                    />
                ))}
            </Menu>
          </View>

          <View style={styles.modalActions}>
            <Button onPress={handleCloseModal} style={{ marginRight: 8 }}>Cancelar</Button>
            <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
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
    padding: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  list: {
    paddingBottom: 80,
  },
  card: {
    marginBottom: 10,
    backgroundColor: 'white',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  input: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
});