
import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Card as PaperCard, Text, useTheme } from 'react-native-paper';
import { Layout } from '../constants/Layout';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  mode?: 'elevated' | 'outlined' | 'contained';
  onPress?: () => void;
}

export function Card({ 
  title, 
  subtitle, 
  children, 
  footer, 
  style, 
  mode = 'elevated',
  onPress
}: CardProps) {
  const theme = useTheme();

  return (
    <PaperCard 
      style={[
        styles.card, 
        { backgroundColor: theme.colors.surface },
        style
      ]} 
      mode={mode}
      onPress={onPress}
    >
      {(title || subtitle) && (
        <PaperCard.Title 
          title={title} 
          subtitle={subtitle} 
          titleStyle={[styles.title, { color: theme.colors.onSurface }]}
          subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
        />
      )}
      <PaperCard.Content>
        {children}
      </PaperCard.Content>
      {footer && (
        <PaperCard.Actions style={[styles.footer, { borderColor: theme.colors.outline }]}>
          {footer}
        </PaperCard.Actions>
      )}
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadius.md,
    marginVertical: Layout.spacing.sm,
    // Improved shadow for elevation
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  footer: {
    borderTopWidth: 0.5, // Thinner border
    paddingTop: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
    justifyContent: 'flex-end',
  },
});
