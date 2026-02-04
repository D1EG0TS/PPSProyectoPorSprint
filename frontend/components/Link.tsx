import React from 'react';
import { Link as ExpoLink } from 'expo-router';
import { Text, useTheme } from 'react-native-paper';
import { StyleSheet, TextStyle, TouchableOpacity } from 'react-native';

interface LinkProps {
  href: string;
  children: React.ReactNode;
  style?: TextStyle;
  variant?: 'bodySmall' | 'bodyMedium' | 'bodyLarge' | 'labelSmall' | 'labelMedium' | 'labelLarge';
}

export function Link({ href, children, style, variant = 'bodyMedium' }: LinkProps) {
  const theme = useTheme();
  
  return (
    <ExpoLink href={href} asChild>
      <TouchableOpacity>
        <Text
          variant={variant}
          style={[
            styles.link,
            { color: theme.colors.primary },
            style
          ]}
        >
          {children}
        </Text>
      </TouchableOpacity>
    </ExpoLink>
  );
}

const styles = StyleSheet.create({
  link: {
    fontWeight: 'bold',
  },
});
