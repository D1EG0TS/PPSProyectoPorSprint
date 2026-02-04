import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Drawer, useTheme, Avatar, Divider } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIDEBAR_ITEMS } from '../config/navigation';
import { getRoleName } from '../constants/roles';

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  const handleNavigate = (route: string) => {
    router.push(route as any);
    if (onClose) onClose();
  };

  const isActive = (route: string) => pathname === route || pathname.startsWith(route + '/');

  // Filter items based on user role
  const menuItems = SIDEBAR_ITEMS.filter(item => 
    user?.role_id && item.allowedRoles.includes(user.role_id)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Avatar.Text 
            size={50} 
            label={user?.full_name?.substring(0, 2).toUpperCase() || 'US'} 
            style={{ backgroundColor: theme.colors.primary }}
        />
        <View style={styles.userInfo}>
            <Text variant="titleMedium" style={styles.username}>
            {user?.full_name || user?.email}
            </Text>
            <Text variant="bodySmall" style={styles.role}>
            {getRoleName(user?.role_id)}
            </Text>
        </View>
      </View>

      <Divider />

      <Drawer.Section showDivider={false} style={styles.drawerSection}>
        {menuItems.map((item, index) => (
            <Drawer.Item
                key={index}
                label={item.label}
                icon={item.icon}
                active={isActive(item.path)}
                onPress={() => handleNavigate(item.path)}
            />
        ))}
      </Drawer.Section>

      <View style={styles.spacer} />
      
      <Divider />
      
      <Drawer.Section showDivider={false}>
        <Drawer.Item
          label="Cerrar Sesión"
          icon="logout"
          onPress={logout}
        />
      </Drawer.Section>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
  },
  role: {
    opacity: 0.7,
  },
  drawerSection: {
    marginTop: 10,
  },
  spacer: {
    flex: 1,
  },
});
