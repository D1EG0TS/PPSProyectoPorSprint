import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Card, Text, Button, Divider } from 'react-native-paper';
import { OperationalCatalogItem } from '@/types/catalog';
import { Colors } from '@/constants/Colors';
import { useRealTimeStock } from '@/hooks/useRealTimeStock';
import { useAuth } from '@/hooks/useAuth';
import { getImageUrl } from '@/services/api';

interface OperationalProductCardProps {
  item: OperationalCatalogItem;
  onAddToCart: (item: OperationalCatalogItem, currentStock: number) => void;
}

export const OperationalProductCard: React.FC<OperationalProductCardProps> = ({ item, onAddToCart }) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  
  // Use real-time stock
  const { stock, loading } = useRealTimeStock(item.id, undefined, undefined, 0, user?.id); 
  
  // Fallback to item.available_stock if loading first time or error
  const currentStock = stock !== null ? stock : item.available_stock;

  return (
    <Card style={styles.card} onPress={() => setExpanded(!expanded)}>
      <Card.Content>
        {!!item.image_url && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: getImageUrl(item.image_url) }} 
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" numberOfLines={1} style={{flex: 1}}>{item.name}</Text>
          <View style={[
            styles.stockIndicator, 
            { backgroundColor: currentStock > 0 ? Colors.success : Colors.error }
          ]} />
        </View>
        <Text variant="bodySmall" style={{ color: Colors.gray }}>SKU: {item.sku}</Text>
        
        {expanded && (
          <View style={styles.detailsContainer}>
             <Divider style={styles.divider} />
             <Text variant="bodyMedium">Brand: {item.brand || '-'}</Text>
             <Text variant="bodyMedium">Model: {item.model || '-'}</Text>
             <Text variant="bodyMedium">Category: {item.category?.name || item.category?.id || '-'}</Text> 
             {/* Ideally fetch category name, but id for now is okay or fetch full object */}
             <Text variant="bodyMedium">Description: {item.description || '-'}</Text>
             {item.barcode && <Text variant="bodyMedium">Barcode: {item.barcode}</Text>}
             
             {item.locations && item.locations.length > 0 && (
               <View style={{ marginTop: 8 }}>
                 <Text variant="labelLarge" style={{ color: Colors.primary }}>Ubicaciones:</Text>
                 {item.locations.map((loc, idx) => (
                   <Text key={idx} variant="bodySmall" style={{ marginLeft: 8 }}>
                     • {loc.warehouse_name} - {loc.location_code} (Cant: {loc.quantity})
                   </Text>
                 ))}
               </View>
             )}
             
             <Divider style={styles.divider} />
          </View>
        )}

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
  imageContainer: {
    width: '100%',
    height: 140,
    marginBottom: 8,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  }
});
