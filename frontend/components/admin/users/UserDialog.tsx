import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Switch, Text, useTheme, Menu } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../../Modal';
import { Input } from '../../Input';
import { Button } from '../../Button';
import { User } from '../../../services/userService';
import { USER_ROLES, getRoleName } from '../../../constants/roles';
import { useAuth } from '../../../hooks/useAuth';
import { Layout } from '../../../constants/Layout';
import { Colors } from '../../../constants/Colors';

const userSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  role_id: z.number(),
  password: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Validation to ensure password is present on create
const createUserSchema = userSchema.refine((data) => !!data.password && data.password.length >= 6, {
    message: 'La contraseña debe tener al menos 6 caracteres',
    path: ['password'],
});

// Validation for edit allows empty password (no change)
const updateUserSchema = userSchema.refine((data) => !data.password || data.password.length >= 6, {
    message: 'La contraseña debe tener al menos 6 caracteres',
    path: ['password'],
});

type UserFormData = z.infer<typeof userSchema>;

interface UserDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  user?: User; // If provided, we are in Edit mode
}

export function UserDialog({ visible, onDismiss, onSubmit, user }: UserDialogProps) {
  const isEdit = !!user;
  const theme = useTheme();
  const { user: currentUser } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  
  const { control, handleSubmit, reset, formState: { isSubmitting, errors }, setValue, watch } = useForm<UserFormData>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role_id: USER_ROLES.USER,
      password: '',
      is_active: true,
    }
  });

  const selectedRoleId = watch('role_id');

  useEffect(() => {
    if (visible) {
      if (user) {
        reset({
          email: user.email,
          full_name: user.full_name || '',
          role_id: user.role_id,
          password: '', 
          is_active: user.is_active,
        });
      } else {
        reset({
          email: '',
          full_name: '',
          role_id: USER_ROLES.USER,
          password: '',
          is_active: true,
        });
      }
    }
  }, [visible, user, reset]);

  const onFormSubmit = async (data: UserFormData) => {
    // Clean up empty password on edit
    if (isEdit && !data.password) {
      delete data.password;
    }
    await onSubmit(data);
  };

  const availableRoles = Object.values(USER_ROLES).filter(role => {
    // If current user is Super Admin, show all roles
    if (currentUser?.role_id === USER_ROLES.SUPER_ADMIN) {
      return true;
    }
    // If current user is NOT Super Admin, hide Super Admin role
    return role !== USER_ROLES.SUPER_ADMIN;
  });

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar Usuario' : 'Crear Usuario'}
    >
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.email?.message}
              autoCapitalize="none"
              keyboardType="email-address"
              disabled={isEdit} 
              containerStyle={styles.input}
            />
          )}
        />
        
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Nombre Completo"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.full_name?.message}
              autoCapitalize="words"
              containerStyle={styles.input}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={isEdit ? "Nueva Contraseña (Opcional)" : "Contraseña"}
              value={value || ''}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.password?.message}
              secureTextEntry
              placeholder={isEdit ? "Dejar en blanco para mantener la actual" : ""}
              containerStyle={styles.input}
            />
          )}
        />

        <View style={styles.input}>
          <Menu
            visible={showRoleMenu}
            onDismiss={() => setShowRoleMenu(false)}
            anchor={
              <Input
                label="Rol"
                value={getRoleName(selectedRoleId)}
                editable={false}
                right={<Input.Icon icon="menu-down" onPress={() => setShowRoleMenu(true)} />}
                error={errors.role_id?.message}
              />
            }
          >
            {availableRoles.map((role) => (
              <Menu.Item 
                key={role} 
                onPress={() => { 
                  setValue('role_id', role); 
                  setShowRoleMenu(false); 
                }} 
                title={getRoleName(role)} 
              />
            ))}
          </Menu>
        </View>

        <View style={styles.switchContainer}>
            <Text variant="bodyMedium" style={{ color: Colors.text }}>Activo</Text>
            <Controller
                control={control}
                name="is_active"
                render={({ field: { onChange, value } }) => (
                    <Switch value={value} onValueChange={onChange} color={Colors.primary} />
                )}
            />
        </View>

        <View style={styles.actions}>
            <Button variant="outline" onPress={onDismiss} style={{ marginRight: 8 }}>
                Cancelar
            </Button>
            <Button 
                variant="primary"
                onPress={handleSubmit(onFormSubmit)} 
                loading={isSubmitting}
                disabled={isSubmitting}
            >
                {isEdit ? 'Guardar' : 'Crear'}
            </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Layout.spacing.sm,
  },
  input: {
    marginBottom: Layout.spacing.sm,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
    marginTop: Layout.spacing.sm,
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Layout.spacing.md,
  }
});
