import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, FAB, IconButton, Chip, useTheme, Searchbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Table, Column } from '../../../../components/Table';
import { Card } from '../../../../components/Card';
import { Input } from '../../../../components/Input';
import userService, { User, CreateUserData, UpdateUserData } from '../../../../services/userService';
import { getRoleName } from '../../../../constants/roles';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';
import { UserDialog } from '../../../../components/admin/users/UserDialog';
import { UserPermissionsDialog } from '../../../../components/admin/users/UserPermissionsDialog';
import { USER_ROLES } from '../../../../constants/roles';

export default function UsersListScreen() {
  const [users, setUsers] = useState<User[]>([]);
  // ... (rest of state)
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [permissionsDialogVisible, setPermissionsDialogVisible] = useState(false);
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

  const handleOpenPermissions = async (user: User) => {
    try {
      const fullUser = await userService.getUser(user.id);
      setSelectedUser(fullUser);
      setPermissionsDialogVisible(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los permisos del usuario');
    }
  };

  const handleDismissPermissions = () => {
    setPermissionsDialogVisible(false);
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

  const renderUserCard = (user: User) => (
    <Card
      title={user.full_name}
      subtitle={user.email}
      footer={
        <View style={styles.cardActions}>
          {Number(user.role_id) === USER_ROLES.MANAGER && (
             <IconButton 
                icon="shield-account" 
                size={20} 
                iconColor={Colors.primary}
                onPress={() => handleOpenPermissions(user)} 
             />
          )}
          <IconButton icon="pencil" size={20} onPress={() => handleOpenEdit(user)} />
          <IconButton 
            icon="delete" 
            size={20} 
            iconColor={Colors.error}
            onPress={() => handleDelete(user)} 
          />
        </View>
      }
    >
      <View style={styles.cardContent}>
        <View style={styles.row}>
            <Text style={styles.label}>Rol:</Text>
            <Chip mode="outlined" style={styles.chip} textStyle={{fontSize: 12}}>{getRoleName(Number(user.role_id))}</Chip>
        </View>
        <View style={styles.row}>
            <Text style={styles.label}>Estado:</Text>
            <Chip 
              mode="flat" 
              style={{ backgroundColor: user.is_active ? Colors.success + '20' : Colors.error + '20', height: 28 }}
              textStyle={{ color: user.is_active ? Colors.success : Colors.error, fontSize: 12 }}
            >
              {user.is_active ? 'Activo' : 'Inactivo'}
            </Chip>
        </View>
      </View>
    </Card>
  );

  const columns: Column<User>[] = [
    { key: 'id', label: 'ID', numeric: true, width: 60 },
    { key: 'full_name', label: 'Nombre', width: 150 },
    { key: 'email', label: 'Email', width: 220 },
    { 
      key: 'role_id', 
      label: 'Rol',
      width: 120,
      renderCell: (item: User) => <Chip mode="outlined" style={styles.chip}>{getRoleName(Number(item.role_id))}</Chip>
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
          {Number(item.role_id) === USER_ROLES.MANAGER && (
             <IconButton 
                icon="shield-account" 
                size={20} 
                iconColor={Colors.primary}
                onPress={() => handleOpenPermissions(item)} 
             />
          )}
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenContainer>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>Gestión de Usuarios</Text>
          <Input
            placeholder="Buscar usuarios..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            containerStyle={styles.searchbar}
            right={<IconButton icon="magnify" />}
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
          renderCard={renderUserCard}
        />
      </ScreenContainer>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleOpenCreate}
        color={theme.colors.onPrimary}
      />

      <UserDialog
        visible={dialogVisible}
        onDismiss={handleDismiss}
        onSubmit={handleSubmit}
        user={selectedUser}
      />

      <UserPermissionsDialog
        visible={permissionsDialogVisible}
        onDismiss={handleDismissPermissions}
        user={selectedUser}
        onSuccess={loadUsers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  searchbar: {
    backgroundColor: Colors.white,
  },
  actions: {
    flexDirection: 'row',
  },
  chip: {
    height: 28,
  },
  fab: {
    position: 'absolute',
    margin: Layout.spacing.md,
    right: 0,
    bottom: 0,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardContent: {
    gap: 4,
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
  },
  label: {
      fontWeight: 'bold',
      marginRight: 8,
      width: 60,
  }
});
