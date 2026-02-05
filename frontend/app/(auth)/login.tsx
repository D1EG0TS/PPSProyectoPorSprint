import React, { useState } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, Image, ImageBackground } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';

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
  const { isDesktop, isTablet, isSmallDevice, paddingHorizontal, fontSize } = useResponsive();

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
      <View style={[styles.headerContainer, { marginBottom: isSmallDevice ? 24 : 40 }]}>
        <Image 
          source={require('../../assets/isologo_desarrollado.webp')}
          style={[styles.logo, { width: isSmallDevice ? 150 : 200, height: isSmallDevice ? 60 : 80 }]}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={[styles.welcomeText, { fontSize: fontSize.title }]}>BIENVENIDO</Text>
        <Text variant="bodyMedium" style={[styles.subtitleText, { fontSize: fontSize.subtitle }]}>Inicia sesión para acceder a la plataforma</Text>
      </View>

      <View style={styles.formContainer}>
        <Input
          name="email"
          control={control}
          label="Correo Electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email-input"
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor={Colors.primary}
        />

        <Input
          name="password"
          control={control}
          label="Contraseña"
          secureTextEntry
          testID="password-input"
          onSubmitEditing={handleSubmit(onSubmit)}
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor={Colors.primary}
        />

        <View style={styles.row}>
          <View style={styles.checkboxContainer}>
            <Checkbox.Android
              status={rememberMe ? 'checked' : 'unchecked'}
              onPress={() => setRememberMe(!rememberMe)}
              color={Colors.primary}
              uncheckedColor="#9E9E9E"
            />
            <Text onPress={() => setRememberMe(!rememberMe)} style={[styles.rememberMeText, { fontSize: fontSize.body }]}>Recordarme</Text>
          </View>
          <Link href="/forgot-password" variant="bodySmall" style={[styles.forgotPasswordLink, { fontSize: fontSize.body }]}>
            ¿Olvidaste tu contraseña?
          </Link>
        </View>

        <Button
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.loginButton}
          contentStyle={styles.loginButtonContent}
          labelStyle={styles.loginButtonLabel}
          testID="login-button"
          fullWidth
        >
          INICIAR SESIÓN
        </Button>

        <View style={styles.createAccountContainer}>
          <Text variant="bodyMedium" style={{ color: '#666666', fontSize: fontSize.body }}>¿No tienes una cuenta? </Text>
          <Link href="/register" variant="bodyMedium" style={[styles.createAccountLink, { fontSize: fontSize.body }]}>
            Regístrate aquí
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
          
          <View style={[
            styles.cardContainer, 
            { 
              paddingBottom: insets.bottom + 20,
              paddingHorizontal: paddingHorizontal
            }
          ]}>
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
    minHeight: 100,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: 32,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    alignItems: 'center', // Center the form wrapper
  },
  formWrapper: {
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 24,
  },
  welcomeText: {
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  subtitleText: {
    color: '#666666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 8,
    flexWrap: 'wrap', // Allow wrapping on very small screens
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    color: '#424242',
  },
  forgotPasswordLink: {
    textAlign: 'right',
    color: '#666666',
  },
  loginButton: {
    borderRadius: 4,
    marginBottom: 32,
    elevation: 0,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  createAccountLink: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopImageSide: {
    flex: 1.2,
    height: '100%',
  },
  desktopFormSide: {
    flex: 0.8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopFormContent: {
    width: '100%',
    maxWidth: 420,
    padding: 48,
    alignSelf: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
});
