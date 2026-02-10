import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text, ActivityIndicator, useTheme, Divider } from 'react-native-paper';
import { MaintenanceType, MaintenanceCategory } from '../../types/maintenance';
import { maintenanceService } from '../../services/maintenanceService';

interface Props {
  value?: number;
  onSelect: (type: MaintenanceType) => void;
  filterCategory?: MaintenanceCategory;
}

export function MaintenanceTypeSelector({ value, onSelect, filterCategory }: Props) {
  const [types, setTypes] = useState<MaintenanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const data = await maintenanceService.getTypes(true);
      setTypes(data);
    } catch (error) {
      console.error('Failed to load maintenance types', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTypes = filterCategory 
    ? types.filter(t => t.category === filterCategory)
    : types;

  const groupedTypes = filteredTypes.reduce((acc, type) => {
    const cat = type.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(type);
    return acc;
  }, {} as Record<string, MaintenanceType[]>);

  if (loading) return <ActivityIndicator style={styles.loader} />;

  return (
    <View style={styles.container}>
      {Object.entries(groupedTypes).map(([category, categoryTypes]) => (
        <View key={category} style={styles.categorySection}>
          <Text variant="titleSmall" style={{ color: theme.colors.primary, marginBottom: 8, textTransform: 'capitalize' }}>
            {category}
          </Text>
          <View style={styles.chipContainer}>
            {categoryTypes.map(type => (
              <Chip
                key={type.id}
                selected={value === type.id}
                onPress={() => onSelect(type)}
                style={styles.chip}
                showSelectedOverlay
              >
                {type.name}
              </Chip>
            ))}
          </View>
          <Divider style={styles.divider} />
        </View>
      ))}
      {filteredTypes.length === 0 && (
        <Text style={{ textAlign: 'center', color: theme.colors.outline }}>
          No hay tipos de mantenimiento disponibles.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  loader: {
    margin: 20,
  },
  categorySection: {
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  divider: {
    marginTop: 16,
  }
});
