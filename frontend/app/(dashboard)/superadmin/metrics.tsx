import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Title, Paragraph, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import systemService, { SystemMetrics, SystemHealth } from '../../../services/systemService';

export default function SystemMetricsScreen() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  const loadData = async () => {
    try {
      const [metricsData, healthData] = await Promise.all([
        systemService.getMetrics(),
        systemService.getHealth()
      ]);
      setMetrics(metricsData);
      setHealth(healthData);
    } catch (error) {
      console.error('Error loading system data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Title style={styles.title}>System Overview</Title>
        {health && (
          <View style={[styles.statusBadge, { backgroundColor: health.status === 'operational' ? '#4CAF50' : '#F44336' }]}>
            <Text style={styles.statusText}>{health.status.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.grid}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>{metrics?.total_users || 0}</Title>
            <Paragraph>Total Users</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>{metrics?.active_users || 0}</Title>
            <Paragraph>Active Users</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>{metrics?.total_products || 0}</Title>
            <Paragraph>Products</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>{metrics?.total_movements || 0}</Title>
            <Paragraph>Movements</Paragraph>
          </Card.Content>
        </Card>
      </View>

      {health && (
        <Card style={styles.healthCard}>
          <Card.Title title="System Health" />
          <Card.Content>
            <View style={styles.healthRow}>
              <Text>Database Connection:</Text>
              <Text style={{ color: health.database === 'connected' ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                {health.database}
              </Text>
            </View>
            <View style={styles.healthRow}>
              <Text>API Version:</Text>
              <Text>{health.version}</Text>
            </View>
            <View style={styles.healthRow}>
              <Text>Server Time:</Text>
              <Text>{new Date(health.timestamp).toLocaleString()}</Text>
            </View>
          </Card.Content>
        </Card>
      )}

      <View style={styles.actions}>
        <Button mode="contained" onPress={() => router.push('/superadmin/config')} style={styles.button}>
          Configuration
        </Button>
        <Button mode="outlined" onPress={() => router.push('/superadmin/logs')} style={styles.button}>
          Audit Logs
        </Button>
      </View>
      
      <View style={[styles.actions, { marginTop: -20 }]}>
        <Button mode="outlined" icon="cloud-upload" onPress={() => router.push('/superadmin/backup')} style={[styles.button, { width: '90%' }]}>
          System Backup & Restore
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: '48%',
    marginBottom: 16,
    elevation: 2,
  },
  healthCard: {
    marginBottom: 20,
    elevation: 2,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  button: {
    width: '45%',
  }
});
