import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Searchbar, FAB, Text, Card, Button, Badge, IconButton } from 'react-native-paper';
import { useRequestCart } from '@/context/RequestCartContext';
import { BarcodeScanner } from '@/components/catalog/operational/BarcodeScanner';
import { RequestCart } from '@/components/catalog/operational/RequestCart';
import { FrequentProducts } from '@/components/catalog/operational/FrequentProducts';
import { OperationalProductCard } from '@/components/catalog/operational/OperationalProductCard';
import { catalogService } from '@/services/catalogService';
import { OperationalCatalogItem } from '@/types/catalog';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';

export default function OperationalCatalogScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<OperationalCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);
  const { addToCart, getItemCount } = useRequestCart();

  const loadCatalog = useCallback(async (query: string = '') => {
    setLoading(true);
    try {
      const data = await catalogService.getOperationalCatalog(0, 50, query);
      setItems(data);
    } catch (error) {
      console.error('Failed to load catalog', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      loadCatalog(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, loadCatalog]);

  const handleScan = (data: string) => {
    setScannerVisible(false);
    setSearchQuery(data); // Auto-search the scanned code
  };

  const handleAddToCart = (item: OperationalCatalogItem, realTimeStock?: number) => {
    const stock = realTimeStock !== undefined ? realTimeStock : item.available_stock;
    const currentInCart = getItemCount(item.id);
    
    if (stock <= 0 || currentInCart >= stock) {
        // Ideally show a toast here
        console.warn('Not enough stock');
        return;
    }
    addToCart(item, 1);
  };

  const renderItem = ({ item }: { item: OperationalCatalogItem }) => (
    <OperationalProductCard 
        item={item} 
        onAddToCart={handleAddToCart} 
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search SKU, Name..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
          right={() => (
             <IconButton icon="barcode-scan" onPress={() => setScannerVisible(true)} />
          )}
        />
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          !searchQuery ? (
            <FrequentProducts onSelect={handleAddToCart} />
          ) : null
        }
        refreshing={loading}
        onRefresh={() => loadCatalog(searchQuery)}
      />

      <FAB
        icon="cart"
        style={styles.fab}
        onPress={() => setCartVisible(true)}
        label={getItemCount() > 0 ? getItemCount().toString() : undefined}
      />

      <BarcodeScanner
        visible={scannerVisible}
        onDismiss={() => setScannerVisible(false)}
        onScan={handleScan}
      />

      <RequestCart
        visible={cartVisible}
        onDismiss={() => setCartVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  searchBar: {
    backgroundColor: '#f0f0f0',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  card: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stockIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
});
