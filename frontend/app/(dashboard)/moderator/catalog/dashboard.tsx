import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useInternalCatalog } from '@/hooks/useInternalCatalog';
import { Colors } from '@/constants/Colors';

const screenWidth = Dimensions.get('window').width;

export default function CatalogDashboardScreen() {
  const { items, loading, metrics } = useInternalCatalog();

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  // Aggregate data for charts
  
  // Stock by Category
  const categoryCount: Record<string, number> = {};
  items.forEach((item: any) => {
    const catName = item.category?.name || 'Uncategorized';
    categoryCount[catName] = (categoryCount[catName] || 0) + item.total_stock;
  });

  const pieData = Object.keys(categoryCount).map((name, index) => ({
    name,
    population: categoryCount[name],
    color: [Colors.primary, Colors.secondary, Colors.warning, Colors.success, Colors.error][index % 5],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  // Warehouse Stock Distribution
  const warehouseStock: Record<string, number> = {};
  items.forEach((item: any) => {
    if ('stock_by_warehouse' in item) {
      item.stock_by_warehouse.forEach((w: any) => {
        warehouseStock[w.warehouse_name] = (warehouseStock[w.warehouse_name] || 0) + w.quantity;
      });
    }
  });

  const warehouseLabels = Object.keys(warehouseStock);
  const warehouseValues = Object.values(warehouseStock);

  const barData = {
    labels: warehouseLabels,
    datasets: [
      {
        data: warehouseValues,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Stock Dashboard</Text>

      <View style={styles.kpiContainer}>
        <Card style={styles.kpiCard}>
          <Card.Content>
            <Text variant="titleMedium">Total Items</Text>
            <Text variant="headlineMedium">{metrics.totalProducts}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.kpiCard}>
          <Card.Content>
            <Text variant="titleMedium">Low Stock</Text>
            <Text variant="headlineMedium" style={{ color: Colors.error }}>{metrics.lowStockCount}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.kpiCard}>
          <Card.Content>
            <Text variant="titleMedium">Value</Text>
            <Text variant="headlineMedium">${metrics.inventoryValue.toLocaleString()}</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <Card.Title title="Stock by Category" />
        <Card.Content>
          <PieChart
            data={pieData}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>

      <Card style={styles.chartCard}>
        <Card.Title title="Warehouse Distribution" />
        <Card.Content>
          {warehouseLabels.length > 0 ? (
            <BarChart
              data={barData}
              width={screenWidth - 60}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              verticalLabelRotation={30}
            />
          ) : (
            <Text>No warehouse data available</Text>
          )}
        </Card.Content>
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    minWidth: 100,
  },
  chartCard: {
    marginBottom: 16,
    paddingBottom: 16,
  }
});
