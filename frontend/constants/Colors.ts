
const Shared = {
  brand: '#EEB600', // Naranja Exproof
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  // Status Colors (Modernized - inspired by Tailwind CSS)
  success: '#16A34A', // Green 600
  successDark: '#22C55E', // Green 500
  danger: '#DC2626', // Red 600
  dangerDark: '#EF4444', // Red 500
  warning: '#D97706', // Amber 600
  warningDark: '#F59E0B', // Amber 500
  info: '#0284C7', // Sky 600
  infoDark: '#0EA5E9', // Sky 500
};

export const Colors = {
  // Legacy/Backward Compatibility (will be deprecated gradually)
  primary: Shared.brand,
  secondary: '#333333',
  success: Shared.success,
  danger: Shared.danger,
  warning: Shared.warning,
  info: Shared.info,
  light: '#f8f9fa',
  dark: '#333333',
  white: Shared.white,
  transparent: Shared.transparent,
  background: '#FFFFFF',
  surface: '#F4F4F4',
  text: '#333333',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: Shared.danger,
  gray: '#9E9E9E',
  blueBadge: Shared.success,

  // Modern Theme Definitions
  lightScheme: {
    primary: Shared.brand,
    onPrimary: '#1A1A1A', // Dark text on yellow for contrast
    secondary: '#4B5563', // Gray 600
    onSecondary: '#FFFFFF',
    background: '#F9FAFB', // Gray 50
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6', // Gray 100
    text: '#111827', // Gray 900
    textSecondary: '#4B5563', // Gray 600
    border: '#E5E7EB', // Gray 200
    error: Shared.danger,
    success: Shared.success,
    warning: Shared.warning,
    info: Shared.info,
    icon: '#4B5563',
    outline: '#E5E7EB',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  darkScheme: {
    primary: Shared.brand,
    onPrimary: '#1A1A1A',
    secondary: '#9CA3AF', // Gray 400
    onSecondary: '#1F2937',
    background: '#111827', // Gray 900
    surface: '#1F2937', // Gray 800
    surfaceVariant: '#374151', // Gray 700
    text: '#F9FAFB', // Gray 50
    textSecondary: '#9CA3AF', // Gray 400
    border: '#374151', // Gray 700
    error: Shared.dangerDark,
    success: Shared.successDark,
    warning: Shared.warningDark,
    info: Shared.infoDark,
    icon: '#9CA3AF',
    outline: '#374151',
    backdrop: 'rgba(0, 0, 0, 0.7)',
  },
};
