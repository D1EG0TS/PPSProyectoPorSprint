import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Avatar, Divider, Chip } from 'react-native-paper';
import { VehicleDocument, VehicleMaintenance } from '../../services/vehicleService';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'DOCUMENT' | 'MAINTENANCE';
  status?: string;
}

interface DocumentTimelineProps {
  documents: VehicleDocument[];
  maintenances: VehicleMaintenance[];
}

const DocumentTimeline: React.FC<DocumentTimelineProps> = ({ documents, maintenances }) => {
  // Combine and sort events
  const events: TimelineEvent[] = [
    ...documents.map(d => ({
      id: `doc-${d.id}`,
      date: d.expiration_date || 'N/A',
      title: `Document: ${d.document_type}`,
      description: d.verified ? 'Verified' : 'Pending Verification',
      type: 'DOCUMENT' as const,
      status: d.verified ? 'success' : 'warning',
    })),
    ...maintenances.map(m => ({
      id: `maint-${m.id}`,
      date: m.date,
      title: `Maintenance: ${m.maintenance_type}`,
      description: `${m.provider || 'Unknown Provider'} - $${m.cost || 0}`,
      type: 'MAINTENANCE' as const,
      status: 'info',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return <Text style={{ padding: 16, textAlign: 'center', color: '#666' }}>No history available.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      {events.map((event, index) => (
        <View key={event.id} style={styles.eventContainer}>
          <View style={styles.leftColumn}>
            <Text variant="labelSmall" style={styles.date}>{event.date}</Text>
          </View>
          
          <View style={styles.timelineLine}>
            <View style={[styles.dot, { backgroundColor: event.type === 'DOCUMENT' ? '#2196f3' : '#ff9800' }]} />
            {index < events.length - 1 && <View style={styles.line} />}
          </View>

          <View style={styles.rightColumn}>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{event.title}</Text>
                <Text variant="bodySmall">{event.description}</Text>
                {event.status === 'success' && <Chip icon="check" style={styles.chip} textStyle={{fontSize: 10}}>Verified</Chip>}
                {event.status === 'warning' && <Chip icon="alert-circle-outline" style={styles.chip} textStyle={{fontSize: 10}}>Pending</Chip>}
              </Card.Content>
            </Card>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  eventContainer: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  leftColumn: {
    width: 80,
    alignItems: 'flex-end',
    paddingRight: 10,
    paddingTop: 4,
  },
  date: {
    color: '#666',
  },
  timelineLine: {
    alignItems: 'center',
    width: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  rightColumn: {
    flex: 1,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 4,
  },
  chip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    height: 24,
  }
});

export default DocumentTimeline;
