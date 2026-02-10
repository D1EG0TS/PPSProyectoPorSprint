import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Icon } from 'react-native-paper';
import { MaintenanceStatus } from '../../types/maintenance';

interface Props {
  status: MaintenanceStatus;
  created_at?: string;
  updated_at?: string;
}

export function MaintenanceTimeline({ status, created_at, updated_at }: Props) {
  const theme = useTheme();

  const steps = [
    { key: MaintenanceStatus.SCHEDULED, label: 'Programado', icon: 'calendar-clock' },
    { key: MaintenanceStatus.IN_PROGRESS, label: 'En Progreso', icon: 'wrench-clock' },
    { key: MaintenanceStatus.COMPLETED, label: 'Completado', icon: 'check-circle' },
  ];

  // If Cancelled, show simplified view
  if (status === MaintenanceStatus.CANCELLED) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.errorContainer }]}>
        <Icon source="cancel" size={24} color={theme.colors.error} />
        <Text style={{ marginLeft: 8, color: theme.colors.error, fontWeight: 'bold' }}>
          Mantenimiento Cancelado
        </Text>
      </View>
    );
  }

  const currentIndex = steps.findIndex(s => s.key === status);

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const color = isActive ? theme.colors.primary : theme.colors.surfaceDisabled;

        return (
          <View key={step.key} style={styles.stepContainer}>
            <View style={{ alignItems: 'center' }}>
              <Icon 
                source={step.icon} 
                size={24} 
                color={isActive ? theme.colors.primary : '#ccc'} 
              />
              <Text 
                variant="labelSmall" 
                style={{ 
                  color: isActive ? theme.colors.onSurface : '#ccc',
                  fontWeight: isCurrent ? 'bold' : 'normal',
                  marginTop: 4
                }}
              >
                {step.label}
              </Text>
            </View>
            
            {index < steps.length - 1 && (
              <View style={[styles.line, { backgroundColor: index < currentIndex ? theme.colors.primary : '#eee' }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    height: 2,
    width: 40,
    marginHorizontal: 8,
    marginBottom: 16, // Align with icon center roughly
  }
});
