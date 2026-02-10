import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Searchbar } from 'react-native-paper';

interface PublicSearchProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export const PublicSearch: React.FC<PublicSearchProps> = ({ onSearch, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleChange = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search by name, SKU..."
        onChangeText={handleChange}
        value={searchQuery}
        loading={loading}
        style={styles.searchbar}
        elevation={0}
        mode="bar"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchbar: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  }
});
