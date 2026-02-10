import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';
import { StorageLocation } from '../../types/location';
import { Ionicons } from '@expo/vector-icons';
import { CapacityBar } from './CapacityBar';

interface LocationTreeProps {
  locations: StorageLocation[];
  onSelectLocation: (location: StorageLocation) => void;
  selectedId?: number;
}

const LocationTreeNode: React.FC<{
  location: StorageLocation;
  level: number;
  onSelect: (loc: StorageLocation) => void;
  selectedId?: number;
}> = ({ location, level, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = location.children && location.children.length > 0;
  const isSelected = location.id === selectedId;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.node, 
          { marginLeft: level * 16 },
          isSelected && styles.selectedNode
        ]}
        onPress={() => onSelect(location)}
      >
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
          disabled={!hasChildren}
        >
          {hasChildren && (
            <Ionicons 
              name={expanded ? "chevron-down" : "chevron-forward"} 
              size={16} 
              color={Colors.textSecondary} 
            />
          )}
        </TouchableOpacity>
        
        <Ionicons 
          name={location.location_type === 'rack' ? "grid-outline" : "cube-outline"} 
          size={18} 
          color={isSelected ? Colors.primary : Colors.textSecondary} 
          style={styles.icon}
        />
        
        <View style={styles.info}>
          <Text style={[styles.code, isSelected && styles.selectedText]}>
            {location.code}
          </Text>
          <Text style={styles.name}>{location.name}</Text>
        </View>

        {location.capacity > 0 && (
          <View style={styles.miniBar}>
             <CapacityBar 
               current={location.current_occupancy} 
               max={location.capacity} 
               height={4}
               showText={false}
             />
          </View>
        )}
      </TouchableOpacity>

      {expanded && hasChildren && (
        <View>
          {location.children!.map(child => (
            <LocationTreeNode 
              key={child.id} 
              location={child} 
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export const LocationTree: React.FC<LocationTreeProps> = ({ 
  locations, 
  onSelectLocation,
  selectedId 
}) => {
  // Assuming locations provided here are roots (no parent)
  // If flat list is provided, we might need to build tree first.
  // Assuming backend returns tree or we pass roots.
  
  return (
    <ScrollView style={styles.container}>
      {locations.map(loc => (
        <LocationTreeNode 
          key={loc.id} 
          location={loc} 
          level={0}
          onSelect={onSelectLocation}
          selectedId={selectedId}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedNode: {
    backgroundColor: '#FFF8E1', // Light orange/yellow
  },
  expandButton: {
    width: 24,
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  info: {
    flex: 1,
  },
  code: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  selectedText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  miniBar: {
    width: 60,
  }
});
