import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, IconButton, Chip, useTheme, ActivityIndicator, Searchbar, SegmentedButtons } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Table } from '../../../../components/Table';
import { Button } from '../../../../components/Button';
import { getTools, Tool, ToolStatus } from '../../../../services/toolService';
import { useAuth } from '../../../../hooks/useAuth';
import { USER_ROLES } from '../../../../constants/roles';

export default function ToolsListScreen() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();

  const loadTools = async () => {
    try {
      setLoading(true);
      const data = await getTools({
        search: searchQuery || undefined,
      });
      
      // Client-side filtering for status if backend doesn't support it directly in search param yet
      // or if we want to combine filters.
      // The backend service `getTools` supports `serial_number`. 
      // It doesn't explicitly support `status` in the interface I defined, let's update service later if needed.
      // For now, I'll filter client side if needed, or pass it if I update service.
      
      let filteredData = data;
      if (statusFilter) {
        filteredData = data.filter(t => t.status === statusFilter);
      }
      
      setTools(filteredData);
    } catch (error) {
      console.error('Error loading tools:', error);
      Alert.alert('Error', 'No se pudieron cargar las herramientas');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTools();
    }, [searchQuery, statusFilter])
  );

  const getStatusColor = (status: ToolStatus) => {
    switch (status) {
      case ToolStatus.AVAILABLE: return theme.colors.primary;
      case ToolStatus.ASSIGNED: return theme.colors.secondary;
      case ToolStatus.MAINTENANCE: return theme.colors.error;
      case ToolStatus.LOST: return 'gray';
      case ToolStatus.DECOMMISSIONED: return 'black';
      default: return theme.colors.primary;
    }
  };

  const columns = [
    { key: 'serial_number', label: 'Serial' },
    { key: 'status', label: 'Estado', renderCell: (item: Tool) => (
      <Chip style={{ backgroundColor: theme.colors.surfaceVariant }}>
        <Text style={{ color: getStatusColor(item.status) }}>{item.status}</Text>
      </Chip>
    )},
    { key: 'actions', label: 'Acciones', renderCell: (item: Tool) => (
      <View style={styles.actions}>
        <IconButton
          icon="eye"
          size={20}
          onPress={() => router.push(`/(dashboard)/admin/tools/${item.id}`)}
        />
        <IconButton
          icon="pencil"
          size={20}
          onPress={() => router.push(`/(dashboard)/admin/tools/create?id=${item.id}`)} // Reusing create for edit logic if implemented, or separate edit
        />
      </View>
    )},
  ];

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <View style={styles.header}>
          <Text variant="headlineMedium">Gestión de Herramientas</Text>
          <Button 
            variant="primary" 
            icon="plus" 
            onPress={() => router.push('/(dashboard)/admin/tools/create')}
          >
            Nueva Herramienta
          </Button>
        </View>

        <View style={styles.filters}>
          <Searchbar
            placeholder="Buscar por serial..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          {/* Simple Status Filter using Chips or SegmentedButtons */}
          {/* Using a horizontal ScrollView or specific buttons for key statuses */}
        </View>
        <View style={styles.statusFilters}>
            <Chip 
              selected={statusFilter === ''} 
              onPress={() => setStatusFilter('')}
              style={styles.filterChip}
            >Todos</Chip>
            <Chip 
              selected={statusFilter === ToolStatus.AVAILABLE} 
              onPress={() => setStatusFilter(ToolStatus.AVAILABLE)}
              style={styles.filterChip}
            >Disponibles</Chip>
            <Chip 
              selected={statusFilter === ToolStatus.ASSIGNED} 
              onPress={() => setStatusFilter(ToolStatus.ASSIGNED)}
              style={styles.filterChip}
            >Asignadas</Chip>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <Table
            columns={columns}
            data={tools}
            keyExtractor={(item) => item.id.toString()}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filters: {
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    marginRight: 4,
  },
  loader: {
    marginTop: 32,
  },
  actions: {
    flexDirection: 'row',
  },
});
