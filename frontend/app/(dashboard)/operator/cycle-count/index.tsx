import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Chip, FAB, Surface, ActivityIndicator, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { inventoryService, Warehouse } from '../../../../services/inventoryService';
import { Colors } from '../../../../constants/Colors';

interface CycleCountSummary {
  id: number;
  request_number: string;
  warehouse_name: string;
  status: string;
  priority: string;
  total_items: number;
  items_counted: number;
  items_with_variance: number;
  created_at: string;
}

export default function CycleCountListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cycleCounts, setCycleCounts] = useState<CycleCountSummary[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [countsRes, warehousesRes] = await Promise.all([
        inventoryService.getCycleCounts({
          warehouse_id: selectedWarehouse || undefined,
          status: statusFilter || undefined,
        }),
        inventoryService.getWarehouses(),
      ]);

      setCycleCounts(countsRes.counts || []);
      setWarehouses(warehousesRes);
    } catch (error) {
      console.error('Error loading cycle counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWarehouse, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return Colors.success;
      case 'IN_PROGRESS': return Colors.warning;
      case 'PENDING': return Colors.info;
      case 'CANCELLED': return Colors.danger;
      default: return Colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return Colors.danger;
      case 'NORMAL': return Colors.warning;
      case 'LOW': return Colors.info;
      default: return Colors.textSecondary;
    }
  };

  const renderCycleCount = (count: CycleCountSummary) => (
    <Card 
      key={count.id} 
      style={styles.card}
      onPress={() => router.push(`/operator/cycle-count/${count.id}`)}
    >
      <Card.Title
        title={count.request_number}
        subtitle={`${count.warehouse_name} - ${new Date(count.created_at).toLocaleDateString()}`}
        left={(props) => (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(count.status) }]}>
            <Text style={styles.statusBadgeText}>{count.status}</Text>
          </View>
        )}
        right={(props) => (
          <Chip
            compact
            style={{ backgroundColor: getPriorityColor(count.priority) + '20', marginRight: 8 }}
            textStyle={{ color: getPriorityColor(count.priority), fontSize: 10 }}
          >
            {count.priority}
          </Chip>
        )}
      />
      <Card.Content>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{count.total_items}</Text>
            <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Total items</Text>
          </View>
          <View style={styles.stat}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: Colors.info }}>{count.items_counted}</Text>
            <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Contados</Text>
          </View>
          <View style={styles.stat}>
            <Text 
              variant="titleLarge" 
              style={{ 
                fontWeight: 'bold', 
                color: count.items_with_variance > 0 ? Colors.warning : Colors.success 
              }}
            >
              {count.items_with_variance}
            </Text>
            <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Varianzas</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${count.total_items > 0 ? (count.items_counted / count.total_items) * 100 : 0}%` 
                }
              ]} 
            />
          </View>
          <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>
            {count.total_items > 0 ? Math.round((count.items_counted / count.total_items) * 100) : 0}% completado
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Conteo Cíclico</Text>
        <Button 
          mode="contained" 
          onPress={() => router.push('/operator/cycle-count/create')}
          icon="plus"
        >
          Nuevo Conteo
        </Button>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        <Chip 
          selected={!selectedWarehouse}
          onPress={() => setSelectedWarehouse(null)}
          style={styles.filterChip}
          icon="warehouse"
        >
          Todos
        </Chip>
        {warehouses.map(w => (
          <Chip 
            key={w.id}
            selected={selectedWarehouse === w.id}
            onPress={() => setSelectedWarehouse(w.id)}
            style={styles.filterChip}
            icon="warehouse"
          >
            {w.name}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
          <Chip
            key={status}
            selected={statusFilter === status}
            onPress={() => setStatusFilter(statusFilter === status ? null : status)}
            style={styles.filterChip}
            icon="filter"
          >
            {status.replace('_', ' ')}
          </Chip>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : cycleCounts.length === 0 ? (
        <Surface style={styles.emptyState} elevation={0}>
          <Text variant="titleMedium" style={{ color: Colors.textSecondary }}>
            No hay conteos cíclicos
          </Text>
          <Text variant="bodyMedium" style={{ color: Colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
            Crea un nuevo conteo para comenzar
          </Text>
          <Button 
            mode="contained" 
            onPress={() => router.push('/operator/cycle-count/create')}
            style={{ marginTop: 16 }}
          >
            Crear Conteo
          </Button>
        </Surface>
      ) : (
        <View style={styles.listContainer}>
          {cycleCounts.map(renderCycleCount)}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 16,
  },
  listContainer: {
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  stat: {
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
});
