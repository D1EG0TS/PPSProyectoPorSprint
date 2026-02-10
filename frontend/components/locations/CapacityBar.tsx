import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

interface CapacityBarProps {
  current: number;
  max: number;
  height?: number;
  showText?: boolean;
}

export const CapacityBar: React.FC<CapacityBarProps> = ({ 
  current, 
  max, 
  height = 8,
  showText = true 
}) => {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  
  let color = Colors.success;
  if (percentage >= 90) color = Colors.danger;
  else if (percentage >= 75) color = Colors.warning;

  return (
    <View style={styles.container}>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={styles.label}>Ocupación</Text>
          <Text style={[styles.value, { color }]}>
            {percentage.toFixed(1)}% ({current}/{max})
          </Text>
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View 
          style={[
            styles.fill, 
            { 
              width: `${percentage}%`,
              backgroundColor: color,
              height 
            }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  track: {
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  }
});
