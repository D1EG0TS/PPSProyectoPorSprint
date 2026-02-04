import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Text } from 'react-native-paper';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Sistema de Inventario</Text>
      <Text variant="titleMedium" style={styles.subtitle}>Sprint 2.3 - Auth Integration</Text>
      
      {user && (
        <View style={styles.userInfo}>
          <Text variant="bodyLarge">Bienvenido, {user.full_name || user.email}</Text>
          <Text variant="bodyMedium" style={{ color: 'gray' }}>{user.email}</Text>
        </View>
      )}

      <Link href="/details" asChild>
        <Button variant="primary" style={styles.button}>
          Ir a Detalles
        </Button>
      </Link>

      <Button variant="outline" onPress={logout} style={styles.logoutButton} textColor="#d32f2f">
        Cerrar Sesión
      </Button>
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
