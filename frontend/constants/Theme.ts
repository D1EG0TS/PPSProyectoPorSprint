
import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import { Colors } from './Colors';
import { Layout } from './Layout';

// Base properties shared between themes
const baseTheme = {
  roundness: Layout.borderRadius.md,
  animation: {
    scale: 1.0,
  },
};

export const AppLightTheme: MD3Theme = {
  ...MD3LightTheme,
  ...baseTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.lightScheme.primary,
    onPrimary: Colors.lightScheme.onPrimary,
    secondary: Colors.lightScheme.secondary,
    onSecondary: Colors.lightScheme.onSecondary,
    background: Colors.lightScheme.background,
    surface: Colors.lightScheme.surface,
    surfaceVariant: Colors.lightScheme.surfaceVariant,
    onSurface: Colors.lightScheme.text,
    onSurfaceVariant: Colors.lightScheme.textSecondary,
    outline: Colors.lightScheme.outline,
    error: Colors.lightScheme.error,
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FFFFFF',
      level3: '#FFFFFF',
      level4: '#FFFFFF',
      level5: '#FFFFFF',
    },
  },
};

export const AppDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  ...baseTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.darkScheme.primary,
    onPrimary: Colors.darkScheme.onPrimary,
    secondary: Colors.darkScheme.secondary,
    onSecondary: Colors.darkScheme.onSecondary,
    background: Colors.darkScheme.background,
    surface: Colors.darkScheme.surface,
    surfaceVariant: Colors.darkScheme.surfaceVariant,
    onSurface: Colors.darkScheme.text,
    onSurfaceVariant: Colors.darkScheme.textSecondary,
    outline: Colors.darkScheme.outline,
    error: Colors.darkScheme.error,
    elevation: {
        level0: 'transparent',
        level1: '#242B36',
        level2: '#2A323E',
        level3: '#303946',
        level4: '#36404E',
        level5: '#3C4756',
    },
  },
};

export const ComponentStyles = {
  input: {
    marginBottom: Layout.spacing.md,
  },
  button: {
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.xs,
  },
  card: {
    borderRadius: Layout.borderRadius.md,
    elevation: 2,
    marginBottom: Layout.spacing.md,
  },
  table: {
    header: {
      // Background handled dynamically
    },
    row: {
      borderBottomWidth: 1,
    },
  },
};
