import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';

import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Link } from '../../components/Link';

const registerSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirm_password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();

  const { control, handleSubmit } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register({
        email: data.email,
        password: data.password,
        full_name: data.full_name
      });
      Toast.show({
        type: 'success',
        text1: '¡Registro exitoso!',
        text2: 'Tu cuenta ha sido creada correctamente.',
      });
      // Navigation is usually handled by useProtectedRoute or auto-login
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error de registro',
        text2: err.message || 'Ocurrió un error inesperado.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Crear Cuenta</Text>

      <Input
        name="full_name"
        control={control}
        label="Nombre Completo"
        autoCapitalize="words"
        testID="fullname-input"
      />

      <Input
        name="email"
        control={control}
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        testID="email-input"
      />

      <Input
        name="password"
        control={control}
        label="Contraseña"
        secureTextEntry
        testID="password-input"
      />

      <Input
        name="confirm_password"
        control={control}
        label="Confirmar Contraseña"
        secureTextEntry
        testID="confirm-input"
      />

      <Button
        variant="primary"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
        testID="register-button"
      >
        Registrarse
      </Button>

      <View style={styles.footer}>
        <Text variant="bodyMedium">¿Ya tienes cuenta? </Text>
        <Link href="/login" variant="bodyMedium">
          Iniciar Sesión
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: 'bold',
  },
  button: {
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
});
