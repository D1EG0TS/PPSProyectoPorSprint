import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

export const AccessDenied = () => {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={{ color: theme.colors.error, marginBottom: 16 }}>
        Acceso Denegado
      </Text>
      <Text variant="bodyLarge" style={{ marginBottom: 24, textAlign: 'center' }}>
        No tienes permisos suficientes para ver esta sección.
        Contacta a tu administrador si crees que es un error.
      </Text>
      <Button mode="contained" onPress={() => router.back()}>
        Volver
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
});
