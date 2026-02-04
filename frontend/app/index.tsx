import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { Text } from 'react-native-paper';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(dashboard)" />;
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Sistema de Inventario</Text>
      <Text variant="titleMedium" style={styles.subtitle}>Sprint 2.3 - Auth Integration</Text>
      
      <Link href="/login" asChild>
        <Button variant="primary" style={styles.button}>
          Iniciar Sesión
        </Button>
      </Link>

      <Link href="/register" asChild>
        <Button variant="outline" style={styles.logoutButton}>
          Registrarse
        </Button>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    marginBottom: 40,
  },
  userInfo: {
    marginBottom: 30,
    alignItems: 'center',
  },
  button: {
    marginTop: 10,
    width: '100%',
    maxWidth: 300,
  },
  logoutButton: {
    marginTop: 20,
    width: '100%',
    maxWidth: 300,
    borderColor: '#d32f2f',
  },
});
