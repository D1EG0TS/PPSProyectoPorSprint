import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Card as PaperCard, Text } from 'react-native-paper';
import { Colors } from '../constants/Colors';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  mode?: 'elevated' | 'outlined' | 'contained';
}

export function Card({ 
  title, 
  subtitle, 
  children, 
  footer, 
  style, 
  mode = 'elevated' 
}: CardProps) {
  return (
    <PaperCard style={[styles.card, style]} mode={mode}>
      {(title || subtitle) && (
        <PaperCard.Title 
          title={title} 
          subtitle={subtitle} 
          titleStyle={styles.title}
        />
      )}
      <PaperCard.Content>
        {children}
      </PaperCard.Content>
      {footer && (
        <PaperCard.Actions style={styles.footer}>
          {footer}
        </PaperCard.Actions>
      )}
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    marginVertical: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
});
