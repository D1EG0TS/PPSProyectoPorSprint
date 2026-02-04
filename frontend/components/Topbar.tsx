import React from 'react';
import { StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { usePathname } from 'expo-router';

interface TopbarProps {
  onMenuPress: () => void;
}

export function Topbar({ onMenuPress }: TopbarProps) {
  const pathname = usePathname();

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

  const title = getBreadcrumbs();

  return (
    <Appbar.Header style={styles.header} elevated>
      <Appbar.Action icon="menu" onPress={onMenuPress} />
      <Appbar.Content title={title} titleStyle={styles.title} />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {},
  title: {
    fontSize: 16,
  }
});
