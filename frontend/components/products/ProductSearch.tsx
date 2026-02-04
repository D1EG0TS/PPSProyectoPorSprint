import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';
import { getProducts, Product } from '../../services/productService';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  onSelect,
  label = 'Buscar Producto',
  placeholder = 'SKU, Nombre o Código de Barras',
  error
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const data = await getProducts({ search: query, limit: 5 });
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
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="search" size={20} color={Colors.gray} />
              )
            }
          />
        }
        style={styles.input}
      />
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}
      
      {showResults && results.length > 0 && (
        <View style={styles.resultsContainer}>
          {results.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.resultItem}
              onPress={() => handleSelect(product)}
            >
              <View>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSku}>SKU: {product.sku}</Text>
              </View>
              <Text style={styles.stockText}>
                {/* We might want to show available stock here if we had it easily accessible */}
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
    backgroundColor: 'white',
  },
  resultsContainer: {
    position: 'absolute',
    top: 75, // Adjust based on Input height
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontWeight: '600',
    color: '#1f2937',
  },
  productSku: {
    fontSize: 12,
    color: '#6b7280',
  },
  stockText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
