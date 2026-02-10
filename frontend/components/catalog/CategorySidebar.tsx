import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, IconButton, Divider, useTheme } from 'react-native-paper';
import { Category } from '../../services/productService';
import { Colors } from '../../constants/Colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory?: number;
  selectedSubCategory?: number;
  onSelectCategory: (id?: number) => void;
  onSelectSubCategory: (id?: number) => void;
}

export const CategorySidebar = ({ 
  categories, 
  selectedCategory, 
  selectedSubCategory, 
  onSelectCategory, 
  onSelectSubCategory 
}: CategorySidebarProps) => {
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedCategories.includes(id)) {
      setExpandedCategories(expandedCategories.filter(c => c !== id));
    } else {
      setExpandedCategories([...expandedCategories, id]);
    }
  };

  const renderCategory = (category: Category) => {
    const isExpanded = expandedCategories.includes(category.id) || selectedCategory === category.id;
    const isSelected = selectedCategory === category.id && !selectedSubCategory;
    
    // Filter subcategories for this category
    const subCategories = category.subcategories || [];

    return (
      <View key={category.id} style={styles.categoryItem}>
        <TouchableOpacity 
          style={[styles.categoryHeader, isSelected && styles.selectedCategoryHeader]}
          onPress={() => {
            onSelectCategory(category.id);
            if (subCategories.length > 0) {
              toggleExpand(category.id);
            }
          }}
        >
          <Text 
            variant="bodyLarge" 
            style={[
              styles.categoryText, 
              isSelected && styles.selectedCategoryText
            ]}
          >
            {category.name}
          </Text>
          {subCategories.length > 0 && (
            <IconButton 
              icon={isExpanded ? "chevron-down" : "chevron-right"} 
              size={20}
              iconColor={isSelected ? Colors.primary : Colors.textSecondary}
            />
          )}
        </TouchableOpacity>

        {isExpanded && subCategories.length > 0 && (
          <View style={styles.subCategoryList}>
            {subCategories.map(sub => (
              <TouchableOpacity
                key={sub.id}
                style={[
                  styles.subCategoryItem,
                  selectedSubCategory === sub.id && styles.selectedSubCategoryItem
                ]}
                onPress={() => onSelectSubCategory(sub.id)}
              >
                <IconButton icon="chevron-right" size={16} iconColor={Colors.textSecondary} style={{ margin: 0 }} />
                <Text 
                  variant="bodyMedium" 
                  style={[
                    styles.subCategoryText,
                    selectedSubCategory === sub.id && styles.selectedSubCategoryText
                  ]}
                >
                  {sub.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const rootCategories = categories.filter(c => !c.parent_id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerTitle}>Categorías</Text>
      </View>
      <ScrollView style={styles.scroll}>
        <TouchableOpacity 
          style={[styles.categoryHeader, !selectedCategory && styles.selectedCategoryHeader]}
          onPress={() => {
            onSelectCategory(undefined);
            onSelectSubCategory(undefined);
          }}
        >
          <Text 
            variant="bodyLarge" 
            style={[
              styles.categoryText, 
              !selectedCategory && styles.selectedCategoryText
            ]}
          >
            Todos los productos
          </Text>
        </TouchableOpacity>
        
        {rootCategories.map(renderCategory)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: Colors.white,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    height: '100%',
  },
  header: {
    padding: 16,
    backgroundColor: Colors.secondary,
  },
  headerTitle: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  scroll: {
    flex: 1,
  },
  categoryItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectedCategoryHeader: {
    backgroundColor: '#e6f0ff',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  categoryText: {
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  selectedCategoryText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  subCategoryList: {
    backgroundColor: '#f9f9f9',
    paddingVertical: 4,
  },
  subCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingLeft: 24,
  },
  selectedSubCategoryItem: {
    backgroundColor: '#e6f0ff',
  },
  subCategoryText: {
    color: Colors.textSecondary,
  },
  selectedSubCategoryText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
});