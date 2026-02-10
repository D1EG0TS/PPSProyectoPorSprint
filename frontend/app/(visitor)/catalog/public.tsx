import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, useTheme, Button, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PublicProductCard } from '../../../components/catalog/public/PublicProductCard';
import { PublicSearch } from '../../../components/catalog/public/PublicSearch';
import { catalogService } from '../../../services/catalogService';
import { PublicCatalogItem } from '../../../types/catalog';
import { Colors } from '../../../constants/Colors';

export default function PublicCatalogScreen() {
  const [products, setProducts] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();
  const categoryId = params.category_id ? Number(params.category_id) : undefined;
  const categoryName = params.category_name as string;

  const loadCatalog = useCallback(async (query: string = '') => {
    try {
      setLoading(true);
      // If filtering by category, we fetch more items to filter client-side 
      // since backend doesn't support category filter yet.
      const limit = categoryId ? 1000 : 100; 
      const data = await catalogService.getPublicCatalog(0, limit, query);
      
      let filteredData = data;
      if (categoryId) {
        filteredData = data.filter(p => p.category?.id === categoryId);
      }
      
      setProducts(filteredData);
    } catch (error) {
      console.error('Failed to load public catalog:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const timeoutId = setTimeout(() => {
        loadCatalog(query);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCatalog(searchQuery);
  };

  const clearCategory = () => {
    router.setParams({ category_id: '', category_name: '' });
  };

  const renderItem = ({ item }: { item: PublicCatalogItem }) => (
    <PublicProductCard item={item} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>Catalog</Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>Explore our products</Text>
        {categoryName && (
            <View style={styles.filterChip}>
                <Chip onClose={clearCategory} style={{marginTop: 8}}>{categoryName}</Chip>
            </View>
        )}
      </View>

      <PublicSearch onSearch={handleSearch} loading={loading} />

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge">No products found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    paddingBottom: 10,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  filterChip: {
      flexDirection: 'row',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
});
