import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Platform, Dimensions, TouchableOpacity, Image } from 'react-native';
import { Text, Searchbar, ActivityIndicator, IconButton, useTheme, Button, Badge } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { Product, Category, getProducts, getCategories } from '../../../services/productService';
import { ProductCard } from '../../../components/products/ProductCard';
import { CategorySidebar } from '../../../components/catalog/CategorySidebar';
import { Colors } from '../../../constants/Colors';
import { USER_ROLES } from '../../../constants/roles';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

export default function CatalogScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | undefined>(undefined);
  
  const router = useRouter();
  const { user, logout } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getProducts({ 
          search: searchQuery, 
          category_id: selectedSubCategory || selectedCategory,
        }),
        getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedCategory, selectedSubCategory]);

  const getBreadcrumbs = () => {
    const parts = ['Catálogo'];
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) parts.push(cat.name);
      
      if (selectedSubCategory && cat?.subcategories) {
        const sub = cat.subcategories.find(s => s.id === selectedSubCategory);
        if (sub) parts.push(sub.name);
      }
    }
    return parts.join(' > ');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
            {/* Logo Area */}
            <View style={styles.logoContainer}>
                {/* Placeholder for Logo - In real app use Image */}
                <Text variant="headlineMedium" style={styles.logoText}>DIMEINT</Text>
                <Text variant="labelSmall" style={styles.logoSubtext}>Material Eléctrico y Automatización</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="¿Qué está buscando?"
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                    iconColor={Colors.primary}
                />
            </View>

            {/* Right Actions */}
            <View style={styles.headerActions}>
                {user ? (
                    <>
                        {(user.role_id === USER_ROLES.SUPER_ADMIN || user.role_id === USER_ROLES.ADMIN || user.role_id === USER_ROLES.MANAGER) && (
                            <Button 
                                mode="text" 
                                textColor={Colors.white} 
                                onPress={() => router.push('/(dashboard)/admin/products')}
                            >
                                Panel Admin
                            </Button>
                        )}
                        <Button 
                            mode="text" 
                            textColor={Colors.white} 
                            onPress={logout}
                        >
                            Salir
                        </Button>
                    </>
                ) : (
                    <Button 
                        mode="text" 
                        textColor={Colors.white} 
                        onPress={() => router.push('/(auth)/login')}
                    >
                        Ingresar
                    </Button>
                )}
                <IconButton icon="cart" iconColor={Colors.white} size={24} onPress={() => {}} />
            </View>
        </View>
        
        {/* Sub-Header Navigation */}
        <View style={styles.subHeader}>
            <View style={styles.subHeaderContent}>
                <Button mode="text" textColor={Colors.white} labelStyle={{ fontWeight: 'bold' }}>Categorías</Button>
                <Button mode="text" textColor={Colors.white} labelStyle={{ fontWeight: 'bold' }}>Sucursales</Button>
            </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Sidebar (Desktop) */}
        {isDesktop && (
          <View style={styles.sidebar}>
            <CategorySidebar 
              categories={categories}
              selectedCategory={selectedCategory}
              selectedSubCategory={selectedSubCategory}
              onSelectCategory={setSelectedCategory}
              onSelectSubCategory={setSelectedSubCategory}
            />
          </View>
        )}

        {/* Product Grid */}
        <View style={styles.contentArea}>
            {/* Breadcrumbs */}
            <View style={styles.breadcrumbs}>
                <Text style={styles.breadcrumbText}>{getBreadcrumbs()}</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 50 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.grid}>
                    <View style={styles.row}>
                        {products.map((product) => (
                            <View key={product.id} style={styles.col}>
                                <ProductCard product={product} />
                            </View>
                        ))}
                    </View>
                    {products.length === 0 && (
                        <Text style={{ textAlign: 'center', marginTop: 40, width: '100%' }}>
                            No se encontraron productos.
                        </Text>
                    )}
                </ScrollView>
            )}
        </View>
      </View>

      {/* WhatsApp Floating Button */}
      <TouchableOpacity style={styles.whatsappButton} onPress={() => {}}>
        <IconButton icon="whatsapp" iconColor="white" size={32} />
        {/* Tooltip-like message could be added here, simplified for now */}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    marginRight: 20,
  },
  logoText: {
    color: Colors.white,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  logoSubtext: {
    color: '#aaccff',
    fontSize: 10,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 600,
    marginHorizontal: 20,
  },
  searchBar: {
    backgroundColor: Colors.white,
    borderRadius: 4,
    height: 40,
  },
  searchInput: {
    minHeight: 0, 
    height: 40,
    alignSelf: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subHeader: {
    backgroundColor: '#004494', // Darker shade
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  subHeaderContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    backgroundColor: 'white',
  },
  contentArea: {
    flex: 1,
    padding: 20,
  },
  breadcrumbs: {
    marginBottom: 20,
  },
  breadcrumbText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  grid: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  col: {
    width: isDesktop ? '33.333%' : '100%', // 3 columns on desktop, 1 on mobile
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  whatsappButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#25D366',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});