import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getCategories, Category } from '../../../services/productService';
import { Colors } from '../../../constants/Colors';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        // Flatten or handle hierarchy as needed. For now just list all.
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleCategoryPress = (category: Category) => {
    // Navigate to public catalog with search/filter
    // Since public catalog uses search query, we might need to add category filtering to it
    // For now, we'll pass it as a query param if supported, or just navigate
    // Ideally PublicCatalogScreen should accept category_id param
    router.push({
        pathname: '/(visitor)/catalog/public',
        params: { category_id: category.id, category_name: category.name }
    });
  };

  const renderItem = ({ item }: { item: Category }) => (
    <Card style={styles.card} onPress={() => handleCategoryPress(item)}>
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" style={styles.categoryName}>{item.name}</Text>
        {item.description && (
            <Text variant="bodySmall" numberOfLines={2} style={styles.description}>
                {item.description}
            </Text>
        )}
        {/* Count would go here if available */}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>Categories</Text>
      </View>
      
      <FlatList
        data={categories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: 'white',
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  categoryName: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    textAlign: 'center',
    color: '#666',
  }
});
