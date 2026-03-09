
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Avatar, Menu, Divider, useTheme, Text } from 'react-native-paper';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  title?: string;
  onMenuPress?: () => void;
  onBack?: () => void;
}

export function Topbar({ title: customTitle, onMenuPress, onBack }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    if (pathname === '/' || pathname === '/(dashboard)') return 'Inicio';
    
    // Filter out empty parts and group segments (starting with '(')
    const parts = pathname.split('/').filter(part => part && !part.startsWith('('));
    
    const breadcrumbs = parts.map(part => {
        // Simple capitalization
        return part.charAt(0).toUpperCase() + part.slice(1);
    });

    return ['Inicio', ...breadcrumbs].join(' > ');
  };

  const title = customTitle || getBreadcrumbs();

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
    // Router redirect handled by AuthContext/ProtectedRoute usually, but just in case:
    router.replace('/(auth)/login');
  };

  const displayName = user?.name || user?.full_name || user?.email || 'Usuario';
  const getInitials = (name?: string) => ((name || 'U').substring(0, 2).toUpperCase());

  return (
    <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.surface }]} elevated>
      {onBack ? (
        <Appbar.BackAction onPress={onBack} />
      ) : (
        onMenuPress && <Appbar.Action icon="menu" onPress={onMenuPress} />
      )}
      
      <Appbar.Content title={title} titleStyle={styles.title} />

      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <View style={styles.avatarContainer}>
             <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
               {displayName}
             </Text>
             <View onTouchEnd={() => setMenuVisible(true)}>
                <Avatar.Text 
                    size={36} 
                    label={getInitials(displayName)} 
                    style={{ backgroundColor: theme.colors.primary }}
                    color={theme.colors.onPrimary}
                />
             </View>
          </View>
        }
        contentStyle={{ marginTop: 40 }}
      >
        <Menu.Item 
            leadingIcon="account" 
            onPress={() => {
                setMenuVisible(false);
                // Navigate to profile or simple alert for now if page doesn't exist
                // router.push('/(dashboard)/profile'); 
            }} 
            title="Mi Perfil" 
            disabled // Enable when page exists
        />
        <Menu.Item 
            leadingIcon="cog" 
            onPress={() => {
                setMenuVisible(false);
                router.push('/(dashboard)/settings');
            }} 
            title="Configuración" 
        />
        <Divider />
        <Menu.Item 
            leadingIcon="logout" 
            onPress={handleLogout} 
            title="Cerrar Sesión" 
            titleStyle={{ color: theme.colors.error }}
        />
      </Menu>
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    // Background handled by theme
  },
  title: {
    fontSize: 16,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 12,
  },
  userName: {
    fontWeight: '500',
    display: 'none', // Hidden on mobile, could show on desktop
    // We can use media query logic here if we had access to dimensions directly or styled-components
    // For now, let's keep it simple or use a prop to show/hide
  }
});
