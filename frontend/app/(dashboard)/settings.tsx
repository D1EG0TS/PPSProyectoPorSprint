
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, List, RadioButton, Switch, useTheme, Divider, Avatar } from 'react-native-paper';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getRoleName } from '../../constants/roles';

export default function SettingsScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useAppTheme();
  const { user } = useAuth();

  const displayName = user?.name || user?.full_name || user?.email || 'Usuario';
  const initials = (displayName?.substring(0, 2) || 'U').toUpperCase();
  const roleLabel = getRoleName(user?.role_id);

  return (
    <ScreenContainer>
        <View style={styles.header}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>Configuración</Text>
        </View>

        {/* User Profile Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
             <View style={styles.profileHeader}>
                <Avatar.Text 
                    size={64} 
                    label={initials} 
                    style={{ backgroundColor: theme.colors.primary }}
                    color={theme.colors.onPrimary}
                />
                <View style={styles.profileInfo}>
                    <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>{displayName}</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{user?.email}</Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 4 }}>{roleLabel}</Text>
                </View>
             </View>
        </View>

        {/* Appearance Section */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>APARIENCIA</Text>
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title="Tema"
            description="Selecciona el modo de visualización"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
          />
          <RadioButton.Group onValueChange={value => setThemeMode(value as any)} value={themeMode}>
            <RadioButton.Item label="Sistema (Automático)" value="system" />
            <RadioButton.Item label="Modo Claro" value="light" />
            <RadioButton.Item label="Modo Oscuro" value="dark" />
          </RadioButton.Group>
        </View>

        {/* Notifications Section (Placeholder) */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>NOTIFICACIONES</Text>
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
             <List.Item
                title="Notificaciones Push"
                description="Recibir alertas de stock bajo"
                left={props => <List.Icon {...props} icon="bell-outline" />}
                right={() => <Switch value={true} onValueChange={() => {}} color={theme.colors.primary} />}
             />
             <Divider />
             <List.Item
                title="Correos Electrónicos"
                description="Recibir reportes semanales"
                left={props => <List.Icon {...props} icon="email-outline" />}
                right={() => <Switch value={false} onValueChange={() => {}} color={theme.colors.primary} />}
             />
        </View>

        <Text variant="bodySmall" style={{ textAlign: 'center', marginTop: 32, color: theme.colors.onSurfaceVariant }}>
            Versión 1.0.0
        </Text>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 12,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 1,
  },
  profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 16,
  },
  profileInfo: {
      flex: 1,
  }
});
