import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { StorageLocation } from '../../types/location';
import { CapacityBar } from './CapacityBar';
import { Ionicons } from '@expo/vector-icons';

interface LocationCardProps {
  location: StorageLocation;
  onPress?: () => void;
  showCapacity?: boolean;
}

export const LocationCard: React.FC<LocationCardProps> = ({ 
  location, 
  onPress,
  showCapacity = true
}) => {
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="cube-outline" size={24} color={Colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.code}>{location.code}</Text>
          <Text style={styles.name}>{location.name}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{location.location_type}</Text>
        </View>
      </View>

      {showCapacity && location.capacity > 0 && (
        <View style={styles.capacity}>
          <CapacityBar 
            current={location.current_occupancy} 
            max={location.capacity} 
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  code: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  name: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  badge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  capacity: {
    marginTop: 12,
  }
});
