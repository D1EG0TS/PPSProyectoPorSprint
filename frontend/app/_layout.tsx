
import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthProvider } from '../context/AuthContext';
import { RequestCartProvider } from '../context/RequestCartContext';
import { CatalogProvider } from '../context/CatalogContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { LoadingScreen } from '../components/LoadingScreen';
import { toastConfig } from '../components/Toast';

function RootLayoutNav() {
  const { isLoading } = useAuth();
  const theme = useTheme();
  useProtectedRoute();
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.onPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
        <Stack.Screen name="(visitor)" options={{ headerShown: false }} />
      </Stack>
      <Toast config={toastConfig} />
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CatalogProvider>
            <RequestCartProvider>
              <RootLayoutNav />
            </RequestCartProvider>
          </CatalogProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
