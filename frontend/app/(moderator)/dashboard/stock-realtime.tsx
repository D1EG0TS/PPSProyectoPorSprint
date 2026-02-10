import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Colors } from '@/constants/Colors';
import { useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { getWebSocketClient } from '@/services/websocketClient';
import { useAuth } from '@/hooks/useAuth';

const screenWidth = Dimensions.get('window').width;

// Mock Data Interfaces
interface DashboardMetrics {
  totalProducts: number;
  totalValue: number;
  movementsToday: number;
  lowStockCount: number;
}

export default function StockRealTimeDashboard() {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProducts: 0,
    totalValue: 0,
    movementsToday: 0,
    lowStockCount: 0
  });
  const { user } = useAuth();

  const loadData = async () => {
    // Avoid double loading if already loading? 
    // Maybe better to allow background refresh.
    if (loading) return; 
    
    setLoading(true);
    try {
      const response = await api.get('/stock/dashboard/metrics');
      setMetrics(response.data);
    } catch (e) {
      console.error("Failed to load dashboard metrics", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;
    const client = getWebSocketClient(user.id);

    const handleUpdate = () => {
        // Refresh metrics on any stock update
        // Use a slight delay or throttle?
        // For now, just call API again.
        // Optimization: Debounce this call if many updates come in.
        // But loadData checks 'loading', so it prevents overlap.
        // We might want to force reload though.
        // Let's create a silent reload function.
        silentReload();
    };

    const silentReload = async () => {
        try {
             const response = await api.get('/stock/dashboard/metrics');
             setMetrics(response.data);
        } catch(e) { console.error(e); }
    };

    client.subscribe('stock_updated', handleUpdate);
    client.subscribe('movement_applied', handleUpdate);

    return () => {
        client.unsubscribe('stock_updated', handleUpdate);
        client.unsubscribe('movement_applied', handleUpdate);
    };
  }, [user?.id]);

  const chartConfig = {
    backgroundGradientFrom: Colors.background,
    backgroundGradientTo: Colors.background,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false 
  };

  const movementsData = {
    labels: ["8am", "10am", "12pm", "2pm", "4pm", "6pm"],
    datasets: [
      {
        data: [2, 5, 8, 12, 4, 3],
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 2 
      }
    ],
    legend: ["Movements per Hour"] 
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Real-Time Stock</Text>
        <Button mode="outlined" onPress={loadData} compact>Refresh</Button>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <>
          <View style={styles.metricsContainer}>
            <Card style={styles.metricCard}>
              <Card.Content>
                <Text variant="labelMedium">Total Products</Text>
                <Text variant="headlineSmall">{metrics.totalProducts}</Text>
              </Card.Content>
            </Card>
            <Card style={styles.metricCard}>
              <Card.Content>
                <Text variant="labelMedium">Movements Today</Text>
                <Text variant="headlineSmall">{metrics.movementsToday}</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.metricCard, { backgroundColor: metrics.lowStockCount > 0 ? '#FFEBEE' : 'white' }]}>
              <Card.Content>
                <Text variant="labelMedium" style={{ color: metrics.lowStockCount > 0 ? Colors.error : Colors.text }}>Low Stock</Text>
                <Text variant="headlineSmall" style={{ color: metrics.lowStockCount > 0 ? Colors.error : Colors.text }}>{metrics.lowStockCount}</Text>
              </Card.Content>
            </Card>
          </View>

          <Card style={styles.chartCard}>
            <Card.Title title="Movements Activity" />
            <Card.Content>
              <LineChart
                data={movementsData}
                width={screenWidth - 48}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: 16 }}
              />
            </Card.Content>
          </Card>

          <Card style={styles.chartCard}>
            <Card.Title title="Top Moved Products" />
            <Card.Content>
               {/* Placeholder for list or another chart */}
               <Text>1. Safety Gloves (45)</Text>
               <Text>2. Helmet Type A (30)</Text>
               <Text>3. Vest Reflective (22)</Text>
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
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
  loader: {
    marginTop: 50,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: '32%',
  },
  chartCard: {
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 8,
  }
});
