import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '../constants/Colors';

interface FormGroupProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormGroup({ label, error, children }: FormGroupProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.danger,
  },
});
