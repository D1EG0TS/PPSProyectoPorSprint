import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, FAB, IconButton, Chip, useTheme, Searchbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Table } from '../../../../components/Table';
import userService, { User, CreateUserData, UpdateUserData } from '../../../../services/userService';
import { getRoleName } from '../../../../constants/roles';
import { Colors } from '../../../../constants/Colors';
import { UserDialog } from './UserDialog';

export default function UsersListScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  
  const router = useRouter();
  const theme = useTheme();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers({
        search: searchQuery || undefined,
      });
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [searchQuery])
  );

  const handleDelete = (user: User) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de desactivar al usuario ${user.email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.deleteUser(user.id);
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el usuario');
            }
          }
        }
      ]
    );
  };

  const handleOpenCreate = () => {
    setSelectedUser(undefined);
    setDialogVisible(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setDialogVisible(true);
  };

  const handleDismiss = () => {
    setDialogVisible(false);
    setSelectedUser(undefined);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedUser) {
        await userService.updateUser(selectedUser.id, data as UpdateUserData);
        Alert.alert('Éxito', 'Usuario actualizado correctamente');
      } else {
        await userService.createUser(data as CreateUserData);
        Alert.alert('Éxito', 'Usuario creado correctamente');
      }
      handleDismiss();
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      const message = error.response?.data?.detail || 'No se pudo guardar el usuario';
      Alert.alert('Error', message);
    }
  };

  const columns = [
    { key: 'id', label: 'ID', numeric: true, width: 60 },
    { key: 'full_name', label: 'Nombre', width: 150 },
    { key: 'email', label: 'Email', width: 220 },
    { 
      key: 'role_id', 
      label: 'Rol',
      width: 120,
      renderCell: (item: User) => <Chip mode="outlined" style={styles.chip}>{getRoleName(item.role_id)}</Chip>
    },
    { 
      key: 'is_active', 
      label: 'Estado',
      width: 100,
      renderCell: (item: User) => (
        <Chip 
          mode="flat" 
          style={{ backgroundColor: item.is_active ? Colors.success + '20' : Colors.error + '20' }}
          textStyle={{ color: item.is_active ? Colors.success : Colors.error }}
        >
          {item.is_active ? 'Activo' : 'Inactivo'}
        </Chip>
      )
    },
    {
      key: 'actions',
      label: 'Acciones',
      width: 100,
      renderCell: (item: User) => (
        <View style={styles.actions}>
          <IconButton icon="pencil" size={20} onPress={() => handleOpenEdit(item)} />
          <IconButton 
            icon="delete" 
            size={20} 
            iconColor={Colors.error}
            onPress={() => handleDelete(item)} 
          />
        </View>
      )
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <View style={styles.header}>
          <Text variant="headlineMedium">Gestión de Usuarios</Text>
          <Searchbar
            placeholder="Buscar usuarios..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
        </View>

        <Table
          data={users}
          columns={columns}
          loading={loading}
          keyExtractor={(item) => item.id.toString()}
          itemsPerPage={10}
          emptyMessage="No se encontraron usuarios"
          minWidth={800}
        />
      </ScrollableContent>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleOpenCreate}
      />

      <UserDialog
        visible={dialogVisible}
        onDismiss={handleDismiss}
        onSubmit={handleSubmit}
        user={selectedUser}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 16,
    gap: 12,
  },
  searchbar: {
    elevation: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actions: {
    flexDirection: 'row',
  },
  chip: {
    height: 28,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
