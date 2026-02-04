import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Table } from '../../../../components/Table';
import { getUserTools, Tool, ToolStatus } from '../../../../services/toolService';
import { useAuth } from '../../../../hooks/useAuth';
import { ScrollableContent } from '../../../../components/ScrollableContent';

export default function MyToolsScreen() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  const loadMyTools = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getUserTools(user.id);
      setTools(data);
    } catch (error) {
      console.error('Error loading my tools:', error);
      Alert.alert('Error', 'No se pudieron cargar tus herramientas');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMyTools();
    }, [user])
  );

  const columns = [
    { key: 'serial_number', label: 'Serial' },
    { key: 'status', label: 'Estado', renderCell: (item: Tool) => (
      <Chip>{item.status}</Chip>
    )},
    { key: 'actions', label: 'Acciones', renderCell: (item: Tool) => (
      <Button 
        mode="outlined" 
        onPress={() => router.push(`/(dashboard)/operator/tools/${item.id}/check-out`)}
        compact
      >
        Devolver
      </Button>
    )},
  ];

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <Text variant="headlineMedium" style={styles.title}>Mis Herramientas</Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : tools.length === 0 ? (
          <Text style={styles.empty}>No tienes herramientas asignadas.</Text>
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
  title: {
    marginBottom: 16,
  },
  loader: {
    marginTop: 32,
  },
  empty: {
    marginTop: 32,
    textAlign: 'center',
    color: 'gray',
  },
});
