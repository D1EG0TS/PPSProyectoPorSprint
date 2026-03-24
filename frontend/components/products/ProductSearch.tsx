import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TextInput, HelperText, useTheme } from 'react-native-paper';
import { getProducts, Product } from '../../services/productService';
import { Ionicons } from '@expo/vector-icons';

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  locationId?: number;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  onSelect,
  label = 'Buscar Producto',
  placeholder = 'SKU, Nombre o Código de Barras',
  error,
  locationId
}) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const data = await getProducts({ search: query, limit: 5, location_id: locationId });
          setResults(data);
          setShowResults(true);
        } catch (err) {
          console.error('Error searching products', err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label={label}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        error={!!error}
        right={
          <TextInput.Icon
            icon={() =>
              loading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} />
              )
            }
          />
        }
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
      />
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}
      
      {showResults && results.length > 0 && (
        <View style={[styles.resultsContainer, { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        }]}>
          {results.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[styles.resultItem, { 
                borderBottomColor: theme.colors.outlineVariant,
              }]}
              onPress={() => handleSelect(product)}
            >
              <View style={styles.resultInfo}>
                <Text style={[styles.productName, { color: theme.colors.onSurface }]}>
                  {product.name}
                </Text>
                <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>
                  SKU: {product.sku}
                </Text>
              </View>
              <Text style={[styles.stockText, { color: theme.colors.onSurfaceVariant }]}>
                ID: {product.id}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 8,
  },
  input: {
    // Background set inline with theme
  },
  resultsContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    maxHeight: 200,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    fontSize: 14,
  },
  productSku: {
    fontSize: 12,
    marginTop: 2,
  },
  stockText: {
    fontSize: 12,
  },
});
