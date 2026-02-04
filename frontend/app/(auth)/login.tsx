import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';

import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Link } from '../../components/Link';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      Toast.show({
        type: 'success',
        text1: '¡Bienvenido!',
        text2: 'Has iniciado sesión correctamente.',
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error de inicio de sesión',
        text2: err.message || 'Ocurrió un error inesperado.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Iniciar Sesión</Text>

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

      <View style={styles.row}>
        <View style={styles.checkboxContainer}>
          <Checkbox
            status={rememberMe ? 'checked' : 'unchecked'}
            onPress={() => setRememberMe(!rememberMe)}
          />
          <Text onPress={() => setRememberMe(!rememberMe)}>Recordarme</Text>
        </View>
        <Link href="/forgot-password" variant="bodyMedium">
          ¿Olvidaste tu contraseña?
        </Link>
      </View>

      <Button
        variant="primary"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
        testID="login-button"
      >
        Ingresar
      </Button>

      <View style={styles.footer}>
        <Text variant="bodyMedium">¿No tienes cuenta? </Text>
        <Link href="/register" variant="bodyMedium">
          Registrarse
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
});
