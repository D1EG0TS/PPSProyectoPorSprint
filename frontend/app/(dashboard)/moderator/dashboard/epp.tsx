import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import { getEPPs, EPP, EPPStatus } from '../../../../services/eppService';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';

export default function EPPDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [epps, setEpps] = useState<EPP[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    expired: 0,
    expiringSoon: 0,
  });
  const [chartData, setChartData] = useState<{ labels: string[], datasets: { data: number[] }[] }>({
    labels: [],
    datasets: [{ data: [] }]
  });

  const screenWidth = Dimensions.get('window').width;

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getEPPs();
      setEpps(data);
      processData(data);
    } catch (error) {
      console.error('Error loading EPP data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los datos del dashboard',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const processData = (data: EPP[]) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    let total = 0;
    let assigned = 0;
    let expired = 0;
    let expiringSoon = 0;

    // Monthly aggregation for the next 6 months
    const monthCounts: { [key: string]: number } = {};
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Initialize next 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(now.getMonth() + i);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      monthCounts[key] = 0;
    }

    data.forEach(epp => {
      total++;
      if (epp.status === EPPStatus.ASSIGNED) assigned++;
      if (epp.status === EPPStatus.EXPIRED) expired++;

      if (epp.expiration_date) {
        const expDate = new Date(epp.expiration_date);
        
        // Expiring soon check (active EPPs only)
        if (epp.status === EPPStatus.ASSIGNED && expDate > now && expDate <= thirtyDaysFromNow) {
          expiringSoon++;
        }

        // Monthly stats (count expirations regardless of status, or maybe just active?)
        // Let's count all to show the wave of expirations
        const monthKey = `${months[expDate.getMonth()]} ${expDate.getFullYear()}`;
        if (monthCounts.hasOwnProperty(monthKey)) {
          monthCounts[monthKey]++;
        }
      }
    });

    setStats({ total, assigned, expired, expiringSoon });

    setChartData({
      labels: Object.keys(monthCounts),
      datasets: [{
        data: Object.values(monthCounts)
      }]
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Dashboard EPP</Text>
        <Button icon="refresh" mode="outlined" onPress={loadData}>Actualizar</Button>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]}>
              <Card.Content>
                <Text variant="titleMedium">Total EPPs</Text>
                <Text variant="displaySmall">{stats.total}</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Card.Content>
                <Text variant="titleMedium">Asignados</Text>
                <Text variant="displaySmall">{stats.assigned}</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: theme.colors.errorContainer }]}>
              <Card.Content>
                <Text variant="titleMedium">Vencidos</Text>
                <Text variant="displaySmall">{stats.expired}</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: 'orange' }]}>
              <Card.Content>
                <Text variant="titleMedium">Vencen pronto</Text>
                <Text variant="displaySmall">{stats.expiringSoon}</Text>
                <Text variant="bodySmall">Próximos 30 días</Text>
              </Card.Content>
            </Card>
          </View>

          <Card style={styles.chartCard}>
            <Card.Title title="Vencimientos Próximos 6 Meses" subtitle="Cantidad de EPPs que expiran por mes" />
            <Card.Content>
              {chartData.datasets[0].data.some(v => v > 0) ? (
                <BarChart
                  data={chartData}
                  width={screenWidth - 64} // Card padding + Screen padding
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: theme.colors.surface,
                    backgroundGradientFrom: theme.colors.surface,
                    backgroundGradientTo: theme.colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => theme.colors.primary, // `rgba(103, 80, 164, ${opacity})`,
                    labelColor: (opacity = 1) => theme.colors.onSurface,
                    style: {
                      borderRadius: 16
                    },
                    barPercentage: 0.5,
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                  showValuesOnTopOfBars
                />
              ) : (
                <Text style={{ textAlign: 'center', marginVertical: 20 }}>No hay vencimientos previstos para los próximos 6 meses.</Text>
              )}
            </Card.Content>
          </Card>
        </View>
      )}
    </ScrollView>
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
    marginTop: 50,
  },
  content: {
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%', // Roughly half minus gap
    minWidth: 150,
  },
  chartCard: {
    marginBottom: 20,
  }
});
