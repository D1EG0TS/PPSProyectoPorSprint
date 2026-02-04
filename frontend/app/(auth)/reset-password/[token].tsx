import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import api from '../../../services/api';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirm_password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Token no válido o faltante.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: data.password,
      });
      
      Toast.show({
        type: 'success',
        text1: 'Contraseña actualizada',
        text2: 'Tu contraseña ha sido restablecida. Inicia sesión con tu nueva contraseña.',
      });
      
      // Delay navigation slightly to show toast
      setTimeout(() => {
        router.replace('/login');
      }, 2000);

    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.response?.data?.detail || err.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Restablecer Contraseña</Text>
      <Text style={styles.text}>
        Ingresa tu nueva contraseña.
      </Text>

      <Input
        name="password"
        control={control}
        label="Nueva Contraseña"
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
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={isLoading}
        style={styles.button}
        testID="submit-button"
      >
        Cambiar Contraseña
      </Button>
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
    marginBottom: 20,
    fontWeight: 'bold',
  },
  text: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  button: {
    marginTop: 10,
  },
});
