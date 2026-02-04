import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { LoadingScreen } from '../components/LoadingScreen';
import { toastConfig } from '../components/Toast';
import { Colors } from '../constants/Colors';

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
  const { isLoading } = useAuth();
  useProtectedRoute();
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.text, // Contrast correction for Orange background
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
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
            <RootLayoutNav />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
