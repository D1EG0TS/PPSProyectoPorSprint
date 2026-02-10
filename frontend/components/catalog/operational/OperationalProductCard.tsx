import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { OperationalCatalogItem } from '@/types/catalog';
import { Colors } from '@/constants/Colors';
import { useRealTimeStock } from '@/hooks/useRealTimeStock';
import { useAuth } from '@/hooks/useAuth';

interface OperationalProductCardProps {
  item: OperationalCatalogItem;
  onAddToCart: (item: OperationalCatalogItem, currentStock: number) => void;
}

export const OperationalProductCard: React.FC<OperationalProductCardProps> = ({ item, onAddToCart }) => {
  const { user } = useAuth();
  // Use real-time stock
  const { stock, loading } = useRealTimeStock(item.id, undefined, undefined, 0, user?.id); 
  
  // Fallback to item.available_stock if loading first time or error
  const currentStock = stock !== null ? stock : item.available_stock;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" numberOfLines={1} style={{flex: 1}}>{item.name}</Text>
          <View style={[
            styles.stockIndicator, 
            { backgroundColor: currentStock > 0 ? Colors.success : Colors.error }
          ]} />
        </View>
        <Text variant="bodySmall" style={{ color: Colors.gray }}>{item.sku}</Text>
        
        <View style={styles.cardFooter}>
          <Text variant="bodyMedium">
            Available: {loading && stock === null ? '...' : currentStock}
          </Text>
          <Button 
            mode="contained-tonal" 
            icon="cart-plus" 
            onPress={() => onAddToCart(item, currentStock)}
            disabled={!item.can_add_to_request || currentStock <= 0}
            compact
          >
            Add
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    marginHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  stockIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
