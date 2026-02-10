import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthProvider } from '../context/AuthContext';
import { RequestCartProvider } from '../context/RequestCartContext';
import { CatalogProvider } from '../context/CatalogContext';
import { useAuth } from '../hooks/useAuth';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { LoadingScreen } from '../components/LoadingScreen';
import { toastConfig } from '../components/Toast';
import { Colors } from '../constants/Colors';
import { USER_ROLES } from '../constants/roles';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    error: Colors.danger,
    background: Colors.background,
    surface: Colors.surface,
    onSurface: Colors.text,
    outline: Colors.secondary,
  },
};

function RootLayoutNav() {
  const { isLoading, user } = useAuth();
  useProtectedRoute();
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Define logic for initial route based on role if needed, 
  // but useProtectedRoute handles most redirects.
  // Here we just define the stacks available.

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
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
      <PaperProvider 
        theme={theme}
        settings={{
          icon: props => <MaterialCommunityIcons {...props} />,
        }}
      >
        <AuthProvider>
          <CatalogProvider>
            <RequestCartProvider>
              <RootLayoutNav />
            </RequestCartProvider>
          </CatalogProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
