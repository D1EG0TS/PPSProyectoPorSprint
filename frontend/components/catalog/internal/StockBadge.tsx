import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { Colors } from '../../../constants/Colors';

interface StockBadgeProps {
  current: number;
  min: number;
}

export const StockBadge: React.FC<StockBadgeProps> = ({ current, min }) => {
  const isLow = current < min;
  const isZero = current === 0;

  let color = Colors.success;
  let label = 'OK';

  if (isZero) {
    color = Colors.error;
    label = 'Out of Stock';
  } else if (isLow) {
    color = Colors.warning;
    label = 'Low Stock';
  }

  return (
    <Chip 
      style={[styles.chip, { backgroundColor: color + '20' }]} // 20% opacity for bg
      textStyle={{ color: color, fontSize: 12 }}
    >
      {label} ({current}/{min})
    </Chip>
  );
};

const styles = StyleSheet.create({
  chip: {
    height: 24,
    alignItems: 'center',
  }
});
