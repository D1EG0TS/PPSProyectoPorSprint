import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { PublicCatalogItem } from '../../../types/catalog';
import { useRouter } from 'expo-router';

interface PublicProductCardProps {
  item: PublicCatalogItem;
}

export const PublicProductCard: React.FC<PublicProductCardProps> = ({ item }) => {
  const router = useRouter();
  const theme = useTheme();

  const handlePress = () => {
    router.push({
      pathname: '/(visitor)/catalog/[id]',
      params: { id: item.id, item: JSON.stringify(item) }
    });
  };

  return (
    <Card style={styles.card} onPress={handlePress}>
      <Card.Content>
        <Text variant="titleMedium" numberOfLines={2} style={styles.title}>
          {item.name}
        </Text>
        <Text variant="bodySmall" style={styles.sku}>
          SKU: {item.sku}
        </Text>
        <Text variant="bodyMedium" numberOfLines={3} style={styles.description}>
          {item.description || 'No description available.'}
        </Text>
        
        <View style={styles.footer}>
          <View style={styles.badges}>
             {item.category && (
               <View style={[styles.badge, { backgroundColor: theme.colors.secondaryContainer }]}>
                 <Text style={{ fontSize: 10, color: theme.colors.onSecondaryContainer }}>
                   {item.category.name}
                 </Text>
               </View>
             )}
             {item.unit && (
                <View style={[styles.badge, { backgroundColor: '#f0f0f0' }]}>
                  <Text style={{ fontSize: 10 }}>{item.unit.abbreviation}</Text>
                </View>
             )}
          </View>
          
          <Button mode="text" onPress={handlePress} compact>
            View Details
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: 'white',
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sku: {
    color: '#666',
    marginBottom: 8,
  },
  description: {
    marginBottom: 12,
    color: '#444',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  }
});
