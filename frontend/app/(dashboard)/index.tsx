import { Redirect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../constants/roles';
import { View, ActivityIndicator } from 'react-native';

export default function DashboardIndex() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user?.role_id === USER_ROLES.SUPER_ADMIN || user?.role_id === USER_ROLES.ADMIN) {
    return <Redirect href="/(dashboard)/admin/dashboard" />;
  }

  if (user?.role_id === USER_ROLES.MANAGER) { // Moderator/Manager
    return <Redirect href="/(dashboard)/moderator/dashboard" />;
  }
  
  // Default fallback for others
  return <Redirect href="/(dashboard)/inventory" />;
}
