import React from 'react';
import { StyleSheet, Image, View } from 'react-native';
import { Card, Text, useTheme, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Product } from '../../services/productService';
import { Colors } from '../../constants/Colors';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export const ProductCard = ({ product, onPress }: ProductCardProps) => {
  const theme = useTheme();
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(visitor)/catalog/${product.id}`);
    }
  };

  // Placeholder image
  const imageSource = { uri: 'https://via.placeholder.com/150' };

  return (
    <Card style={styles.card} onPress={handlePress} mode="elevated">
      <Card.Cover source={imageSource} style={styles.cover} />
      <Card.Content style={styles.content}>
        <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>
        <Text variant="bodySmall" style={styles.category}>
          SKU: {product.sku}
        </Text>
        {/* Role 5 (Visitor) might not see price, but if available show it */}
        {product.price !== undefined && product.price !== null && (
          <Text variant="titleLarge" style={styles.price}>
            ${Number(product.price).toFixed(2)}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  cover: {
    height: 140,
  },
  content: {
    paddingTop: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  category: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  price: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
