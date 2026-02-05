import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Switch, Text, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../../../../components/Modal';
import { Input } from '../../../../components/Input';
import { User } from '../../../../services/userService';
import { USER_ROLES, getRoleName } from '../../../../constants/roles';
import { useAuth } from '../../../../hooks/useAuth';
import { Picker } from '@react-native-picker/picker';

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
  
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<UserFormData>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role_id: USER_ROLES.USER,
      password: '',
      is_active: true,
    }
  });

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
        <Input
          name="email"
          control={control}
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          disabled={isEdit} 
        />
        
        <Input
          name="full_name"
          control={control}
          label="Nombre Completo"
          autoCapitalize="words"
        />

        <Input
            name="password"
            control={control}
            label={isEdit ? "Nueva Contraseña (Opcional)" : "Contraseña"}
            secureTextEntry
            placeholder={isEdit ? "Dejar en blanco para mantener la actual" : ""}
        />

        <View style={styles.field}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Rol</Text>
            <View style={[styles.pickerContainer, { borderColor: theme.colors.outline }]}>
                <Controller
                    control={control}
                    name="role_id"
                    render={({ field: { onChange, value } }) => (
                        <Picker
                            selectedValue={value}
                            onValueChange={(itemValue) => onChange(Number(itemValue))}
                            style={styles.picker}
                        >
                            {availableRoles.map((role) => (
                                <Picker.Item key={role} label={getRoleName(role)} value={role} />
                            ))}
                        </Picker>
                    )}
                />
            </View>
        </View>

        <View style={styles.switchContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Activo</Text>
            <Controller
                control={control}
                name="is_active"
                render={({ field: { onChange, value } }) => (
                    <Switch value={value} onValueChange={onChange} />
                )}
            />
        </View>

        <Button 
            mode="contained" 
            onPress={handleSubmit(onFormSubmit)} 
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
        >
            {isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  field: {
    gap: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  picker: {
    height: Platform.OS === 'web' ? 40 : 50,
    width: '100%',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 8,
  }
});
