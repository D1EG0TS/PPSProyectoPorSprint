import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { catalogService } from '../../../services/catalogService';
import { OperationalCatalogItem } from '../../../types/catalog';
import { Colors } from '../../../constants/Colors';

interface FrequentProductsProps {
  onSelect: (item: OperationalCatalogItem) => void;
}

export const FrequentProducts: React.FC<FrequentProductsProps> = ({ onSelect }) => {
  const [items, setItems] = useState<OperationalCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFrequentProducts();
  }, []);

  const loadFrequentProducts = async () => {
    try {
      // TODO: Replace with actual frequent products logic based on history
      // For now, we fetch a few operational items
      const data = await catalogService.getOperationalCatalog(0, 5);
      setItems(data);
    } catch (error) {
      console.error('Failed to load frequent products', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>Frequent Items</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {items.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => onSelect(item)}>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text numberOfLines={1} variant="labelLarge" style={styles.itemName}>{item.name}</Text>
                <Text variant="bodySmall" style={styles.sku}>{item.sku}</Text>
                <View style={styles.stockBadge}>
                    <Text style={{color: 'white', fontSize: 10}}>Stock: {item.available_stock}</Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  title: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  loader: {
    margin: 20,
  },
  card: {
    width: 140,
    marginRight: 10,
    backgroundColor: 'white',
  },
  cardContent: {
    padding: 10,
    alignItems: 'center',
  },
  itemName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sku: {
    color: Colors.gray,
    marginBottom: 4,
  },
  stockBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4
  }
});
