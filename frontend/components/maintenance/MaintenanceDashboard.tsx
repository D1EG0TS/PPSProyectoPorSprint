import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, Text, useTheme, ActivityIndicator, Title, Divider } from 'react-native-paper';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { maintenanceService } from '../../services/maintenanceService';
import { DashboardStats } from '../../types/maintenance';

const screenWidth = Dimensions.get('window').width;

export function MaintenanceDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await maintenanceService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No data available</Text>
      </View>
    );
  }

  // Process data for Pie Chart
  const pieData = Object.entries(stats.count_by_type).map(([key, value], index) => ({
    name: key,
    population: value,
    color: index === 0 ? theme.colors.primary : index === 1 ? theme.colors.error : theme.colors.secondary,
    legendFontColor: theme.colors.onSurface,
    legendFontSize: 12
  }));

  // Process data for Bar Chart (Monthly Costs)
  // Take last 6 months for better fit
  const last6Months = stats.monthly_costs.slice(-6);
  const barData = {
    labels: last6Months.map(m => m.month.split('-')[1]), // Just month number
    datasets: [
      {
        data: last6Months.map(m => m.cost)
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, // Primary color
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => theme.colors.onSurface,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.header}>Maintenance Dashboard</Text>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}>
          <Card.Content>
            <Text variant="titleMedium">Cost (Month)</Text>
            <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
              ${stats.total_cost_month.toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.kpiCard}>
          <Card.Content>
            <Text variant="titleMedium">Cost (Year)</Text>
            <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
              ${stats.total_cost_year.toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
      </View>

      <Divider style={styles.divider} />

      {/* Maintenance Types Pie Chart */}
      <Card style={styles.chartCard}>
        <Card.Title title="Maintenance Types" />
        <Card.Content>
          <PieChart
            data={pieData}
            width={screenWidth - 64}
            height={200}
            chartConfig={chartConfig}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute
          />
        </Card.Content>
      </Card>

      {/* Monthly Costs Bar Chart */}
      <Card style={styles.chartCard}>
        <Card.Title title="Monthly Costs Trend" />
        <Card.Content>
          {barData.datasets[0].data.length > 0 ? (
            <BarChart
              data={barData}
              width={screenWidth - 64}
              height={220}
              yAxisLabel="$"
              chartConfig={chartConfig}
              verticalLabelRotation={0}
              fromZero
            />
          ) : (
            <Text>No cost data available yet</Text>
          )}
        </Card.Content>
      </Card>

      {/* Top Vehicles List */}
      <Card style={styles.chartCard}>
        <Card.Title title="Top Vehicles by Cost (Year)" />
        <Card.Content>
          {stats.top_vehicles_cost.map((v, index) => (
            <View key={v.vehicle_id} style={styles.vehicleRow}>
              <Text variant="bodyLarge" style={styles.rank}>#{index + 1}</Text>
              <View style={styles.vehicleInfo}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{v.name}</Text>
              </View>
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                ${v.cost.toLocaleString()}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    flex: 0.48,
    elevation: 2,
  },
  divider: {
    marginBottom: 16,
  },
  chartCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: 'white',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  rank: {
    width: 30,
    fontWeight: 'bold',
    color: '#666',
  },
  vehicleInfo: {
    flex: 1,
  },
});
