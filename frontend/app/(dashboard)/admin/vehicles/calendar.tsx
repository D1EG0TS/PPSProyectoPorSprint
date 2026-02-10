import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SectionList } from 'react-native';
import { Text, Card, Chip, useTheme, FAB, SegmentedButtons } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { maintenanceService } from '../../../services/maintenanceService';
import { UpcomingMaintenance } from '../../../types/maintenance';
import { LoadingScreen } from '../../../components/LoadingScreen';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MaintenanceCalendarScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [items, setItems] = useState<UpcomingMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('upcoming'); // upcoming | history

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Currently getUpcoming returns maintenances due soon
      const data = await maintenanceService.getUpcoming();
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const groupData = () => {
    const grouped: { title: string; data: UpcomingMaintenance[] }[] = [];
    
    // Sort by date
    const sorted = [...items].sort((a, b) => 
      new Date(a.next_date).getTime() - new Date(b.next_date).getTime()
    );

    sorted.forEach(item => {
      const date = parseISO(item.next_date);
      const title = format(date, 'EEEE d MMMM yyyy', { locale: es });
      
      const existing = grouped.find(g => g.title === title);
      if (existing) {
        existing.data.push(item);
      } else {
        grouped.push({ title, data: [item] });
      }
    });

    return grouped;
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Calendario de Mantenimientos' }} />
      
      <View style={styles.header}>
        <Text variant="bodyMedium" style={{color: '#666'}}>
            Próximos mantenimientos preventivos calculados automáticamente.
        </Text>
      </View>

      <SectionList
        sections={groupData()}
        keyExtractor={(item, index) => item.vehicle_id + item.maintenance_type_name + index}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={{color: theme.colors.primary, fontWeight: 'bold'}}>
              {title.charAt(0).toUpperCase() + title.slice(1)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Card 
            style={styles.card}
            onPress={() => router.push(`/(dashboard)/admin/vehicles/${item.vehicle_id}/maintenance/new?type=${item.maintenance_type_name}`)}
          >
            <Card.Content>
              <View style={styles.row}>
                <View>
                    <Text variant="titleMedium">{item.license_plate} - {item.brand} {item.model}</Text>
                    <Text variant="bodyMedium">{item.maintenance_type_name}</Text>
                </View>
                <Chip mode="outlined" style={{borderColor: item.is_overdue ? theme.colors.error : theme.colors.primary}}>
                    {item.is_overdue ? 'Vencido' : 'Pendiente'}
                </Chip>
              </View>
              <Text variant="bodySmall" style={{marginTop: 8}}>
                Vence: {format(parseISO(item.next_date), 'dd/MM/yyyy')}
              </Text>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
            <View style={styles.empty}>
                <Text>No hay mantenimientos próximos.</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeader: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: {
      padding: 20,
      alignItems: 'center'
  }
});
