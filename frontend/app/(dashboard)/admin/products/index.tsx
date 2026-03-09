
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { Text, IconButton, Chip, useTheme, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Table, Column } from '../../../../components/Table';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { EmptyState } from '../../../../components/EmptyState';
import { getProducts, deleteProduct, updateProduct, Product, getCategories, Category } from '../../../../services/productService';
import { useAuth } from '../../../../hooks/useAuth';
import { usePermission } from '../../../../hooks/usePermission';
import { useResponsive } from '../../../../hooks/useResponsive';
import { AccessDenied } from '../../../../components/AccessDenied';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';
import { Input } from '../../../../components/Input';

export default function ProductsListScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showInactive, setShowInactive] = useState(true);
  
  const router = useRouter();
  const theme = useTheme();
  const { hasPermission } = usePermission();
  const { isMobile } = useResponsive();

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getProducts({ search: searchQuery, category_id: selectedCategory, include_inactive: showInactive }),
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
      if (hasPermission('inventory:view')) {
        loadData();
      }
    }, [searchQuery, selectedCategory, showInactive, hasPermission])
  );

  if (!hasPermission('inventory:view')) {
    return <AccessDenied />;
  }

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

  const handleRestore = (product: Product) => {
    Alert.alert(
      'Confirmar reactivación',
      `¿Estás seguro de que deseas reactivar el producto "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reactivar',
          onPress: async () => {
            try {
              await updateProduct(product.id, { is_active: true });
              loadData();
            } catch (error) {
              console.error('Error restoring product:', error);
              Alert.alert('Error', 'No se pudo reactivar el producto');
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
      `"${p.name}"`, 
      p.category_id,
      p.unit_id,
      p.cost,
      p.price,
      p.is_active,
      p.has_batch,
      p.has_expiration
    ]);
    
    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    
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

  const renderProductCard = (p: Product) => (
    <Card
      title={p.name}
      subtitle={`SKU: ${p.sku}`}
      mode="elevated"
      footer={
        <View style={styles.cardActions}>
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
            icon={p.is_active ? "delete" : "refresh"} 
            size={20} 
            iconColor={p.is_active ? theme.colors.error : theme.colors.primary}
            onPress={() => p.is_active ? handleDelete(p) : handleRestore(p)} 
          />
        </View>
      }
    >
      <View style={styles.cardContent}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Precio: ${p.price}</Text>
        <Chip 
          icon={p.is_active ? 'check' : 'close'} 
          mode="outlined" 
          style={{ 
            borderColor: p.is_active ? theme.colors.primary : theme.colors.error, 
            alignSelf: 'flex-start', 
            marginTop: 8 
          }}
          textStyle={{ color: theme.colors.onSurface }}
        >
            {p.is_active ? 'Activo' : 'Inactivo'}
        </Chip>
      </View>
    </Card>
  );

  const columns: Column<Product>[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Nombre' },
    { key: 'price', label: 'Precio', numeric: true, renderCell: (p) => `$${p.price}` },
    { 
      key: 'is_active', 
      label: 'Estado', 
      renderCell: (p) => (
        <Chip 
          icon={p.is_active ? 'check' : 'close'} 
          mode="outlined" 
          style={{ borderColor: p.is_active ? theme.colors.primary : theme.colors.error }}
          textStyle={{ color: theme.colors.onSurface }}
        >
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
            icon={p.is_active ? "delete" : "refresh"} 
            size={20} 
            iconColor={p.is_active ? theme.colors.error : theme.colors.primary}
            onPress={() => p.is_active ? handleDelete(p) : handleRestore(p)} 
          />
        </View>
      )
    }
  ];

  const ActionButtons = () => (
    <>
        <Button variant="outline" onPress={() => router.push('/(dashboard)/admin/categories')} style={{ marginRight: 8 }}>
            Categorías
        </Button>
        <Button variant="outline" onPress={() => router.push('/(dashboard)/admin/units')} style={{ marginRight: 8 }}>
            Unidades
        </Button>
        <Button variant="outline" icon="download" onPress={handleExportCSV} style={{ marginRight: 8 }}>
            Exportar
        </Button>
        <Button 
        variant="primary" 
        icon="plus" 
        onPress={() => router.push('/(dashboard)/admin/products/create')}
        >
        Registrar Nuevo
        </Button>
    </>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>Gestión de Productos</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{products.length} productos encontrados</Text>
        </View>
        
        {/* Responsive Action Buttons */}
        {isMobile ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.mobileActionsScroll}
              contentContainerStyle={styles.mobileActionsContainer}
            >
                <ActionButtons />
            </ScrollView>
        ) : (
            <View style={styles.headerButtons}>
                <ActionButtons />
            </View>
        )}
      </View>

      <View style={styles.filters}>
        <Input
            placeholder="Buscar por nombre o SKU"
            onChangeText={setSearchQuery}
            value={searchQuery}
            containerStyle={styles.searchbar}
            right={<IconButton icon="magnify" />}
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
        <Button 
          variant={showInactive ? "primary" : "outline"} 
          onPress={() => setShowInactive(!showInactive)} 
          icon={showInactive ? "eye" : "eye-off"}
        >
          {showInactive ? "Ocultar Inactivos" : "Mostrar Inactivos"}
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />
      ) : products.length === 0 ? (
        <EmptyState 
          title="No se encontraron productos"
          description="Intenta ajustar los filtros de búsqueda o crea un nuevo producto."
          icon="package-variant-closed"
          actionLabel="Crear Producto"
          onAction={() => router.push('/(dashboard)/admin/products/create')}
        />
      ) : (
        <Table
          columns={columns}
          data={products}
          keyExtractor={(item) => item.id.toString()}
          itemsPerPage={10}
          renderCard={renderProductCard}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  headerButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
  },
  mobileActionsScroll: {
      marginTop: 8,
      flexGrow: 0,
  },
  mobileActionsContainer: {
      paddingRight: 16,
      alignItems: 'center',
  },
  filters: {
      flexDirection: 'row',
      marginBottom: Layout.spacing.md,
      gap: Layout.spacing.md,
      alignItems: 'center',
      flexWrap: 'wrap',
  },
  searchbar: {
      flex: 1,
      minWidth: 200,
      maxWidth: 400,
  },
  loader: {
    marginTop: 50,
  },
  actions: {
    flexDirection: 'row',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardContent: {
    gap: 4,
  },
});
