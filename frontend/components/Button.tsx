import React from 'react';
import { StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Button as PaperButton, ButtonProps as PaperButtonProps } from 'react-native-paper';
import { Colors } from '../constants/Colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'info' | 'light' | 'dark';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends Omit<PaperButtonProps, 'mode'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function Button({ 
  variant = 'primary', 
  size = 'medium', 
  fullWidth = false,
  style, 
  labelStyle,
  children, 
  loading,
  disabled,
  ...props 
}: ButtonProps) {
  
  const getMode = (): PaperButtonProps['mode'] => {
    if (variant === 'outline') return 'outlined';
    if (variant === 'light') return 'contained-tonal'; // or outlined?
    return 'contained';
  };

  const getButtonColor = () => {
    if (variant === 'outline') return undefined; // uses theme or text color
    if (disabled) return undefined;
    
    switch (variant) {
      case 'primary': return Colors.primary;
      case 'secondary': return Colors.secondary;
      case 'danger': return Colors.danger;
      case 'success': return Colors.success;
      case 'warning': return Colors.warning;
      case 'info': return Colors.info;
      case 'dark': return Colors.dark;
      case 'light': return Colors.light;
      default: return Colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return undefined;
    
    if (variant === 'outline') return Colors.primary;
    if (variant === 'light') return Colors.dark;
    if (variant === 'warning') return Colors.dark; // better contrast
    if (variant === 'primary') return Colors.dark; // Exproof Orange needs dark text for contrast
    return Colors.white;
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 0, minHeight: 32 };
      case 'large':
        return { paddingVertical: 8, minHeight: 56 };
      default:
        return { paddingVertical: 4, minHeight: 48 }; // Increased to 48px for better touch target and visibility
    }
  };
  
  const getLabelSizeStyles = () => {
      switch (size) {
          case 'small': return { fontSize: 12, marginVertical: 4, marginHorizontal: 8 };
          case 'large': return { fontSize: 18, marginVertical: 8, marginHorizontal: 24 };
          default: return { fontSize: 14, marginVertical: 6, marginHorizontal: 16 };
      }
  };

  return (
    <PaperButton
      mode={getMode()}
      buttonColor={getButtonColor()}
      textColor={getTextColor()}
      loading={loading}
      disabled={disabled}
      style={[
        styles.button,
        getSizeStyles(),
        fullWidth && styles.fullWidth,
        style
      ]}
      contentStyle={[styles.content]}
      labelStyle={[getLabelSizeStyles(), labelStyle]}
      {...props}
    >
      {children}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 6, // Bootstrap default radius
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    // padding is handled in button style to ensure height control
    height: '100%',
  },
});
