
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ 
  icon = 'package-variant', 
  title, 
  description, 
  actionLabel, 
  onAction,
  style 
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name={icon} 
          size={48} 
          color={theme.colors.primary} 
        />
      </View>
      
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      
      {description && (
        <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <Button 
          mode="contained" 
          onPress={onAction}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    flex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingHorizontal: 16,
  }
});
