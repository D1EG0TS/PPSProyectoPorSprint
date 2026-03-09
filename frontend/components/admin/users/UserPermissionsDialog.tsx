import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Checkbox, List, ActivityIndicator, Divider } from 'react-native-paper';
import { User, Permission } from '../../../types/auth';
import { getPermissions, updateUserPermissions } from '../../../services/permissionService';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { Button } from '../../Button';
import { Modal } from '../../Modal';

interface UserPermissionsDialogProps {
  visible: boolean;
  onDismiss: () => void;
  user?: User;
  onSuccess: () => void;
}

export const UserPermissionsDialog: React.FC<UserPermissionsDialogProps> = ({
  visible,
  onDismiss,
  user,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  // Group permissions by module
  const groupedPermissions = allPermissions.reduce((acc, permission) => {
    const module = permission.module || 'Otros';
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const permissions = await getPermissions();
      setAllPermissions(permissions);
      
      // Pre-select user permissions
      if (user && user.permissions) {
        setSelectedPermissions(user.permissions.map(p => p.id));
      } else {
        setSelectedPermissions([]);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (id: number) => {
    setSelectedPermissions(prev => {
      if (prev.includes(id)) {
        return prev.filter(pId => pId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      await updateUserPermissions(user.id, selectedPermissions);
      onSuccess();
      onDismiss();
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      title={`Permisos: ${user?.full_name || user?.email}`}
    >
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <ScrollView style={styles.content}>
          {Object.entries(groupedPermissions).map(([module, permissions]) => (
            <List.Section key={module}>
              <List.Subheader style={styles.subheader}>{module}</List.Subheader>
              {permissions.map((permission) => (
                <View key={permission.id} style={styles.permissionItem}>
                  <Checkbox
                    status={selectedPermissions.includes(permission.id) ? 'checked' : 'unchecked'}
                    onPress={() => handleTogglePermission(permission.id)}
                    color={Colors.primary}
                  />
                  <View style={styles.permissionText}>
                    <Text variant="bodyLarge">{permission.name}</Text>
                    {permission.description && (
                      <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>
                        {permission.description}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              <Divider />
            </List.Section>
          ))}
          
          {allPermissions.length === 0 && (
            <Text style={styles.emptyText}>No hay permisos definidos en el sistema.</Text>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button variant="outline" onPress={onDismiss} style={styles.button}>
          Cancelar
        </Button>
        <Button 
          variant="primary"
          onPress={handleSave} 
          loading={saving} 
          disabled={saving}
          style={styles.button}
        >
          Guardar
        </Button>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    marginBottom: Layout.spacing.md,
    maxHeight: 400,
  },
  loader: {
    padding: 40,
  },
  subheader: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.xs,
  },
  permissionText: {
    flex: 1,
    marginLeft: Layout.spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    padding: Layout.spacing.lg,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Layout.spacing.sm,
    paddingTop: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    minWidth: 100,
  },
});
