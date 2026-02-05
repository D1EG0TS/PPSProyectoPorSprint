import React from 'react';
import { View, StyleSheet, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';

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
  const { isDesktop, isTablet, isSmallDevice, paddingHorizontal, fontSize } = useResponsive();

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
      <View style={[styles.headerContainer, { marginBottom: isSmallDevice ? 24 : 32 }]}>
         <Image 
          source={require('../../assets/isologo_desarrollado.webp')}
          style={[styles.logo, { width: isSmallDevice ? 100 : 140, height: isSmallDevice ? 50 : 70 }]}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={[styles.title, { fontSize: fontSize.title }]}>CREAR CUENTA</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { fontSize: fontSize.subtitle }]}>Únete a nosotros para empezar</Text>
      </View>

      <View style={styles.formContainer}>
        <Input
          name="full_name"
          control={control}
          label="Nombre Completo"
          autoCapitalize="words"
          testID="fullname-input"
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor={Colors.primary}
        />

        <Input
          name="email"
          control={control}
          label="Email"
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
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor={Colors.primary}
        />

        <Input
          name="confirm_password"
          control={control}
          label="Confirmar Contraseña"
          secureTextEntry
          testID="confirm-input"
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor={Colors.primary}
        />

        <Button
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          testID="register-button"
          fullWidth
        >
          REGISTRARSE
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: '#666666', fontSize: fontSize.body }}>¿Ya tienes cuenta? </Text>
          <Link href="/login" variant="bodyMedium" style={[styles.loginLink, { fontSize: fontSize.body }]}>
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

          <View style={[
            styles.cardContainer, 
            { 
              paddingBottom: insets.bottom + 20,
              paddingHorizontal: paddingHorizontal
            }
          ]}>
            <View style={[styles.formWrapper, { maxWidth: isTablet ? 480 : '100%' }]}>
              {renderFormContent()}
            </View>
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
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: 32,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    alignItems: 'center',
  },
  formWrapper: {
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
  },
  logo: {
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  subtitle: {
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
  button: {
    marginTop: 24,
    borderRadius: 4,
    elevation: 0,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  loginLink: {
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
