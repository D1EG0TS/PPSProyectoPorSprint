import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Tooltip } from 'react-native-paper';
import { useRealTimeStock } from '@/hooks/useRealTimeStock';
import { useAuth } from '@/hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';

interface StockIndicatorProps {
  productId: number;
  warehouseId?: number;
  minStock?: number; // Optional, for color coding logic
  showDetails?: boolean;
  style?: any;
  onPress?: () => void;
}

export const StockIndicator: React.FC<StockIndicatorProps> = ({
  productId,
  warehouseId,
  minStock = 0,
  showDetails = false,
  style,
  onPress
}) => {
  const { user } = useAuth();
  const { stock, loading, error } = useRealTimeStock(productId, warehouseId, undefined, 0, user?.id);

  const statusColor = useMemo(() => {
    if (stock === null) return '#757575'; // Gray for unknown
    if (stock < minStock) return '#F44336'; // Red
    if (stock < minStock * 1.5) return '#FF9800'; // Orange/Yellow
    return '#4CAF50'; // Green
  }, [stock, minStock]);

  const handlePress = () => {
    if (onPress) onPress();
    // In the future, this could toggle a tooltip or modal if showDetails is true
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <MaterialIcons name="error-outline" size={16} color="#F44336" />
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.badge, { backgroundColor: statusColor + '20', borderColor: statusColor }, style]} 
      onPress={handlePress}
      disabled={!onPress && !showDetails}
    >
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Text style={[styles.text, { color: statusColor }]}>
        {stock !== null ? stock : '-'}
      </Text>
      {showDetails && (
         <MaterialIcons name="info-outline" size={14} color={statusColor} style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  }
});
