import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Text, IconButton, Chip, useTheme, ActivityIndicator, Searchbar, Menu, Divider } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Table, Column } from '../../../../components/Table';
import { Button } from '../../../../components/Button';
import { getProducts, deleteProduct, Product, getCategories, Category } from '../../../../services/productService';
import { useAuth } from '../../../../hooks/useAuth';
import { Colors } from '../../../../constants/Colors';

export default function ProductsListScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getProducts({ search: searchQuery, category_id: selectedCategory }),
        getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [searchQuery, selectedCategory])
  );

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Confirmar desactivación',
      `¿Estás seguro de que deseas desactivar el producto "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              loadData();
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'No se pudo desactivar el producto');
            }
          },
        },
      ]
    );
  };

  const handleExportCSV = () => {
    const header = ['ID', 'SKU', 'Name', 'Category', 'Unit', 'Cost', 'Price', 'Active', 'Has Batch', 'Has Expiration'];
    const rows = products.map(p => [
      p.id,
      p.sku,
      `"${p.name}"`, // Quote name to handle commas
      p.category_id,
      p.unit_id,
      p.cost,
      p.price,
      p.is_active,
      p.has_batch,
      p.has_expiration
    ]);
    
    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // In a real web app, we would trigger a download. 
    // For Expo Web/Mobile, we can just alert or log for now, or use Sharing.
    console.log(csvContent);
    if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "products.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } else {
        Alert.alert('Exportado', 'CSV generado en consola (funcionalidad completa solo en web por ahora)');
    }
  };

  const columns: Column<Product>[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Nombre' },
    { key: 'price', label: 'Precio', numeric: true, renderCell: (p) => `$${p.price}` },
    { 
      key: 'is_active', 
      label: 'Estado', 
      renderCell: (p) => (
        <Chip icon={p.is_active ? 'check' : 'close'} mode="outlined" style={{ borderColor: p.is_active ? Colors.success : Colors.error }}>
            {p.is_active ? 'Activo' : 'Inactivo'}
        </Chip>
      )
    },
    {
      key: 'actions',
      label: 'Acciones',
      renderCell: (p) => (
        <View style={styles.actions}>
          <IconButton 
            icon="pencil" 
            size={20} 
            onPress={() => router.push(`/(dashboard)/admin/products/${p.id}/edit`)} 
          />
          {p.has_batch && (
             <IconButton 
             icon="barcode" 
             size={20} 
             onPress={() => router.push(`/(dashboard)/admin/products/${p.id}/batches`)} 
           />
          )}
          <IconButton 
            icon="delete" 
            size={20} 
            iconColor={Colors.error}
            onPress={() => handleDelete(p)} 
          />
        </View>
      )
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <View style={styles.header}>
          <View>
              <Text variant="headlineMedium">Gestión de Productos</Text>
              <Text variant="bodyMedium" style={{ color: Colors.gray }}>{products.length} productos encontrados</Text>
          </View>
          <View style={styles.headerButtons}>
              <Button variant="outline" icon="download" onPress={handleExportCSV} style={{ marginRight: 8 }}>
                  Exportar
              </Button>
              <Button 
              variant="primary" 
              icon="plus" 
              onPress={() => router.push('/(dashboard)/admin/products/create')}
              >
              Crear Producto
              </Button>
          </View>
        </View>

        <View style={styles.filters}>
          <Searchbar
              placeholder="Buscar por nombre o SKU"
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
          />
          <Menu
              visible={showCategoryMenu}
              onDismiss={() => setShowCategoryMenu(false)}
              anchor={
                  <Button variant="outline" onPress={() => setShowCategoryMenu(true)} icon="filter">
                      {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || 'Categoría' : 'Todas las Categorías'}
                  </Button>
              }
          >
              <Menu.Item onPress={() => { setSelectedCategory(undefined); setShowCategoryMenu(false); }} title="Todas" />
              <Divider />
              {categories.map(cat => (
                  <Menu.Item key={cat.id} onPress={() => { setSelectedCategory(cat.id); setShowCategoryMenu(false); }} title={cat.name} />
              ))}
          </Menu>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <Table
            columns={columns}
            data={products}
            keyExtractor={(item) => item.id.toString()}
            itemsPerPage={10}
            emptyMessage="No se encontraron productos"
          />
        )}
      </ScrollableContent>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  headerButtons: {
      flexDirection: 'row',
  },
  filters: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 16,
      alignItems: 'center',
  },
  searchbar: {
      flex: 1,
      maxWidth: 400,
      backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
  },
  loader: {
    marginTop: 50,
  },
  actions: {
    flexDirection: 'row',
  },
});
