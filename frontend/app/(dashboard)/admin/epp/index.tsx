import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, IconButton, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Table } from '../../../../components/Table';
import { Button } from '../../../../components/Button';
import { getEPPs, EPP, EPPStatus } from '../../../../services/eppService';

export default function EPPListScreen() {
  const [epps, setEpps] = useState<EPP[]>([]);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const theme = useTheme();

  const loadEPPs = async () => {
    try {
      setLoading(true);
      const data = await getEPPs();
      setEpps(data);
    } catch (error) {
      console.error('Error loading EPPs:', error);
      Alert.alert('Error', 'No se pudieron cargar los EPPs');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEPPs();
    }, [])
  );

  const getExpirationColor = (expirationDate?: string, status?: EPPStatus) => {
    if (status === EPPStatus.EXPIRED || status === EPPStatus.DAMAGED || status === EPPStatus.DISPOSED) return 'gray';
    if (!expirationDate) return theme.colors.primary;
    
    const days = (new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    if (days < 0) return theme.colors.error; // Red
    if (days <= 30) return 'orange'; // Yellow/Orange
    return 'green'; // Green
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'product', label: 'Producto', renderCell: (item: EPP) => <Text>{item.product?.name || `ID: ${item.product_id}`}</Text> },
    { key: 'serial_number', label: 'Serial' },
    { key: 'status', label: 'Estado', renderCell: (item: EPP) => (
      <Chip style={{ backgroundColor: theme.colors.surfaceVariant }}>
        <Text>{item.status}</Text>
      </Chip>
    )},
    { key: 'expiration', label: 'Caducidad', renderCell: (item: EPP) => {
        const color = getExpirationColor(item.expiration_date, item.status);
        return (
            <Chip icon="clock" style={{ backgroundColor: 'transparent' }} textStyle={{ color: color }}>
                {item.expiration_date || 'N/A'}
            </Chip>
        );
    }},
    { key: 'actions', label: 'Acciones', renderCell: (item: EPP) => (
      <View style={styles.actions}>
         <IconButton
          icon="pencil"
          size={20}
          onPress={() => router.push(`/(dashboard)/admin/epp/create?id=${item.id}`)}
        />
        <IconButton
          icon="account-arrow-right"
          size={20}
          onPress={() => router.push(`/(dashboard)/admin/epp/${item.id}/assign`)}
        />
      </View>
    )},
  ];

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <View style={styles.header}>
          <Text variant="headlineMedium">Gestión de EPP</Text>
          <Button 
            variant="primary" 
            icon="plus" 
            onPress={() => router.push('/(dashboard)/admin/epp/create')}
          >
            Nuevo EPP
          </Button>
        </View>

        <Table
          data={epps}
          columns={columns}
          keyExtractor={(item: EPP) => item.id.toString()}
          emptyMessage="No hay EPPs registrados"
          loading={loading}
        />
      </ScrollableContent>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loader: {
    marginTop: 20,
  },
  actions: {
    flexDirection: 'row',
  },
});
