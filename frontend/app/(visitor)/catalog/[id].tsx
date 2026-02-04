import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, ActivityIndicator, Button, Divider, useTheme } from 'react-native-paper';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Product, getProductById } from '../../../services/productService';
import { Colors } from '../../../constants/Colors';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const theme = useTheme();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        if (!id) return;
        setLoading(true);
        const data = await getProductById(Number(id));
        setProduct(data);
      } catch (err) {
        setError('Error al cargar el producto');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando producto...</Text>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text variant="headlineSmall" style={styles.errorText}>
          {error || 'Producto no encontrado'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Image 
          source={{ uri: 'https://via.placeholder.com/400' }} 
          style={styles.image}
        />
        
        <View style={styles.detailsContainer}>
          <Text variant="headlineMedium" style={styles.title}>{product.name}</Text>
          <Text variant="titleMedium" style={styles.sku}>SKU: {product.sku}</Text>
          
          {product.price !== undefined && product.price !== null && (
            <Text variant="headlineSmall" style={styles.price}>
              ${Number(product.price).toFixed(2)}
            </Text>
          )}

          <Divider style={styles.divider} />

          <Text variant="titleMedium" style={styles.sectionTitle}>Descripción</Text>
          <Text variant="bodyMedium" style={styles.description}>
            {product.description || 'Sin descripción disponible.'}
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text variant="labelMedium" style={styles.label}>Categoría ID</Text>
              <Text variant="bodyLarge">{product.category_id}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text variant="labelMedium" style={styles.label}>Unidad ID</Text>
              <Text variant="bodyLarge">{product.unit_id}</Text>
            </View>
          </View>
          
          {/* Add more details as needed, e.g. stock status if allowed for visitors */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textSecondary,
  },
  errorText: {
    color: Colors.danger,
  },
  content: {
    paddingBottom: 32,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.white,
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: Colors.text,
  },
  sku: {
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  price: {
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    lineHeight: 24,
    color: Colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  infoItem: {
    flex: 1,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: 4,
  },
});
