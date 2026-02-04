import React from 'react';
import { View, StyleSheet, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Link } from '../../components/Link';
import { Colors } from '../../constants/Colors';

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
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const isDesktop = width >= 768;

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

  const renderFormContent = () => (
    <>
      <View style={styles.headerContainer}>
         <Image 
          source={require('../../assets/isologo_desarrollado.webp')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={styles.title}>Crear Cuenta</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Únete a nosotros para empezar</Text>
      </View>

      <View style={styles.formContainer}>
        <Input
          name="full_name"
          control={control}
          label="Nombre Completo"
          autoCapitalize="words"
          testID="fullname-input"
          style={styles.input}
        />

        <Input
          name="email"
          control={control}
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email-input"
          style={styles.input}
        />

        <Input
          name="password"
          control={control}
          label="Contraseña"
          secureTextEntry
          testID="password-input"
          style={styles.input}
        />

        <Input
          name="confirm_password"
          control={control}
          label="Confirmar Contraseña"
          secureTextEntry
          testID="confirm-input"
          style={styles.input}
        />

        <Button
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          testID="register-button"
          fullWidth
        >
          Registrarse
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>¿Ya tienes cuenta? </Text>
          <Link href="/login" variant="bodyMedium" style={styles.loginLink}>
            Iniciar Sesión
          </Link>
        </View>
      </View>
    </>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <ImageBackground 
          source={require('../../assets/instalacion-electrica-industrial-01.webp')} 
          style={styles.desktopImageSide}
          resizeMode="cover"
        />
        <View style={styles.desktopFormSide}>
          <ScrollView contentContainerStyle={styles.desktopFormContent}>
            {renderFormContent()}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <ImageBackground 
      source={require('../../assets/instalacion-electrica-industrial-01.webp')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.spacer} />

          <View style={[styles.cardContainer, { paddingBottom: insets.bottom + 20 }]}>
            {renderFormContent()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  spacer: {
    flex: 1,
    minHeight: 100, // Ensure some background is always visible
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textSecondary,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: Colors.surface,
  },
  button: {
    marginTop: 16,
    borderRadius: 25,
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  loginLink: {
    fontWeight: 'bold',
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopImageSide: {
    flex: 1,
    height: '100%',
  },
  desktopFormSide: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopFormContent: {
    width: '100%',
    maxWidth: 480,
    padding: 40,
    alignSelf: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
});
