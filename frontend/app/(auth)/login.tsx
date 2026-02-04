import React, { useState } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, Image, ImageBackground, Dimensions } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Link } from '../../components/Link';
import { Colors } from '../../constants/Colors';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const isDesktop = width >= 768;

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

  const renderFormContent = () => (
    <>
      <View style={styles.headerContainer}>
        <Image 
          source={require('../../assets/isologo_desarrollado.webp')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={styles.welcomeText}>Bienvenido</Text>
        <Text variant="bodyMedium" style={styles.subtitleText}>Inicia sesión para continuar</Text>
      </View>

      <View style={styles.formContainer}>
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
          onSubmitEditing={handleSubmit(onSubmit)}
          style={styles.input}
        />

        <View style={styles.row}>
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={rememberMe ? 'checked' : 'unchecked'}
              onPress={() => setRememberMe(!rememberMe)}
              color={Colors.primary}
            />
            <Text onPress={() => setRememberMe(!rememberMe)} style={{ color: Colors.textSecondary }}>Recordarme</Text>
          </View>
          <Link href="/forgot-password" variant="bodySmall" style={styles.forgotPasswordLink}>
            ¿Olvidaste tu contraseña?
          </Link>
        </View>

        <Button
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.loginButton}
          testID="login-button"
          fullWidth
        >
          Iniciar sesión
        </Button>

        <View style={styles.createAccountContainer}>
          <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>¿No tienes una cuenta? </Text>
          <Link href="/register" variant="bodyMedium" style={styles.createAccountLink}>
            Regístrate
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
    marginBottom: 32,
  },
  logo: {
    width: 180,
    height: 100,
    marginBottom: 16,
  },
  welcomeText: {
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitleText: {
    color: Colors.textSecondary,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: Colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forgotPasswordLink: {
    textAlign: 'right',
  },
  loginButton: {
    borderRadius: 25,
    marginBottom: 24,
    paddingVertical: 6,
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  createAccountLink: {
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
