import React from 'react';
import { StyleSheet, Image, View, Platform } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Product } from '../../services/productService';
import { Colors } from '../../constants/Colors';
import { getImageUrl } from '../../services/api';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export const ProductCard = ({ product, onPress }: ProductCardProps) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(visitor)/catalog/${product.id}`);
    }
  };

  // Product image
  const imageSource = { uri: getImageUrl(product.image_url) };

  // Calculate stock (this would ideally come from backend aggregation, 
  // but for now we assume product might have a total_quantity field or we check batches if available)
  // Since we don't have total_quantity on Product interface yet in this context, 
  // we'll assume a random or placeholder logic if batches aren't loaded, 
  // OR better: check if batches are present.
  // Actually, for the catalog list, we might not have batches loaded.
  // Let's assume we want to show "X EN EXISTENCIA".
  // For demo purposes, if batches exist, sum them. If not, show "DISPONIBLE" or random.
  // The screenshot shows specific numbers like "5773".
  
  // To make it real, we'd need the backend to return `total_stock`. 
  // For now, let's just display "EN EXISTENCIA" if active, or a mock number if we want to match UI exactly.
  // Let's check if we can get a number.
  // We check if product has `total_stock` property (from catalog service)
  const stock = (product as any).total_stock ?? (product.batches?.reduce((acc, b) => acc + b.quantity, 0) || 0);
  const hasStock = stock > 0; // or product.is_active

  return (
    <Card style={styles.card} onPress={handlePress} mode="elevated">
      <View style={styles.imageContainer}>
        <Image source={imageSource} style={styles.image} resizeMode="contain" />
        
        {/* Badge "X EN EXISTENCIA" */}
        {/* We'll just show "EN EXISTENCIA" if we don't have the exact number, or the number if we do */}
        <View style={styles.badge}>
            <Text style={styles.badgeText}>
                {stock > 0 ? `${stock} EN EXISTENCIA` : 'EN EXISTENCIA'}
            </Text>
        </View>
      </View>

      <Card.Content style={styles.content}>
        {product.price !== undefined && product.price !== null && (
          <Text variant="headlineMedium" style={styles.price}>
            ${Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        )}
        
        <Text variant="bodyLarge" style={styles.title} numberOfLines={3}>
          {product.name}
        </Text>
        
        <View style={styles.detailsContainer}>
          <Text variant="bodySmall" style={styles.brand}>
            {product.brand?.toUpperCase()}
          </Text>
          <Text variant="bodySmall" style={styles.sku}>
             SKU: {product.sku}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: Colors.white,
    borderRadius: 4,
    overflow: 'hidden',
    // Shadow for web/ios
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    height: '100%', // Ensure equal height in grid
  },
  imageContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#fff',
    padding: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: -10, // Slight overflow for ribbon effect if desired, or just inside
    backgroundColor: Colors.blueBadge,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    transform: [{ rotate: '-5deg' }], // Slight tilt like in screenshot? Actually screenshot looks straight but has shadow.
    // Let's keep it simple straight for now, maybe top left.
    // Screenshot has a "ribbon" style.
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    elevation: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  price: {
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  title: {
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  detailsContainer: {
    marginTop: 'auto',
  },
  brand: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sku: {
    color: Colors.textSecondary,
  },
});
