import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Searchbar, ActivityIndicator, Chip, useTheme, Menu, Button, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import { Product, Category, getProducts, getCategories } from '../../../services/productService';
import { ProductCard } from '../../../components/products/ProductCard';
import { Colors } from '../../../constants/Colors';

export default function CatalogScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [orderBy, setOrderBy] = useState<'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | undefined>(undefined);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  
  const theme = useTheme();
  const router = useRouter();
  const { logout } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productsData, categoriesData] = await Promise.all([
        getProducts({ 
          search: searchQuery, 
          category_id: selectedCategory,
          order_by: orderBy
        }),
        getCategories()
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      setError('Error al cargar el catálogo');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedCategory, orderBy]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [searchQuery, selectedCategory, orderBy]);

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.column}>
      <ProductCard product={item} />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text variant="headlineMedium" style={styles.title}>Catálogo</Text>
        <IconButton 
          icon="logout" 
          iconColor={Colors.primary} 
          onPress={logout} 
        />
      </View>
      
      <Searchbar
        placeholder="Buscar productos..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        elevation={0}
      />
      
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
        ListHeaderComponent={
          <Chip
            selected={selectedCategory === undefined}
            onPress={() => setSelectedCategory(undefined)}
            style={styles.chip}
            showSelectedOverlay
          >
            Todos
          </Chip>
        }
        renderItem={({ item }) => (
          <Chip
            selected={selectedCategory === item.id}
            onPress={() => setSelectedCategory(item.id)}
            style={styles.chip}
            showSelectedOverlay
          >
            {item.name}
          </Chip>
        )}
      />
    </View>
  );

  if (loading && !refreshing && products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge">No se encontraron productos</Text>
              <Button mode="text" onPress={() => {
                setSearchQuery('');
                setSelectedCategory(undefined);
              }}>
                Limpiar filtros
              </Button>
            </View>
          ) : null
        }
      />
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
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textSecondary,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.white,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  categoriesList: {
    paddingBottom: 4,
  },
  chip: {
    marginRight: 8,
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    maxWidth: '48%',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
