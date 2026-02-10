import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button, Divider, ActivityIndicator, useTheme, Card } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PublicCatalogItem } from '../../../types/catalog';
import { catalogService } from '../../../services/catalogService';

export default function PublicProductDetailScreen() {
  const { id, item } = useLocalSearchParams();
  const [product, setProduct] = useState<PublicCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    const loadProduct = async () => {
      if (item) {
        try {
          setProduct(JSON.parse(item as string));
          setLoading(false);
          return;
        } catch (e) {
          console.error("Error parsing item param", e);
        }
      }

      if (id) {
        try {
          setLoading(true);
          const fetchedProduct = await catalogService.getPublicProduct(Number(id));
          if (fetchedProduct) {
            setProduct(fetchedProduct);
          }
        } catch (error) {
          console.error('Failed to load product:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadProduct();
  }, [id, item]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Product not found.</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
        <View style={styles.header}>
            <Button icon="arrow-left" mode="text" onPress={() => router.back()} style={styles.backButton}>
                Back to Catalog
            </Button>
        </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>{product.name}</Text>
          <Text variant="titleSmall" style={styles.sku}>SKU: {product.sku}</Text>
          
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text variant="labelLarge" style={styles.label}>Category:</Text>
            <Text variant="bodyLarge">{product.category?.name || 'Uncategorized'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text variant="labelLarge" style={styles.label}>Unit:</Text>
            <Text variant="bodyLarge">{product.unit?.name} ({product.unit?.abbreviation})</Text>
          </View>

          {product.barcode && (
            <View style={styles.infoRow}>
                <Text variant="labelLarge" style={styles.label}>Barcode:</Text>
                <Text variant="bodyLarge">{product.barcode}</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
          <Text variant="bodyMedium" style={styles.description}>
            {product.description || 'No detailed description available.'}
          </Text>

        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
      padding: 10,
  },
  backButton: {
      alignSelf: 'flex-start',
  },
  card: {
    margin: 16,
    marginTop: 0,
    backgroundColor: 'white',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sku: {
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    width: 100,
    fontWeight: 'bold',
    color: '#555',
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  description: {
    lineHeight: 22,
    color: '#333',
  },
});
