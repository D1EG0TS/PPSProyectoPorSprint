import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Title, ActivityIndicator, Searchbar, Chip, Menu, Button, Divider } from 'react-native-paper';
import systemService, { AuditLog } from '../../../services/systemService';

export default function SystemLogsScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // In a real app, we would debounce search and pass params to API
      // For now, let's load latest 100 and filter client-side for demo smoothness
      const data = await systemService.getLogs({ limit: 100 });
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.target_user_email && log.target_user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesAction = actionFilter ? log.action === actionFilter : true;
    
    return matchesSearch && matchesAction;
  });

  const renderItem = ({ item }: { item: AuditLog }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <Chip style={styles.actionChip} textStyle={styles.actionText}>{item.action}</Chip>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <Text style={styles.detailText}>
          <Text style={{fontWeight: 'bold'}}>Target:</Text> {item.target_user_email || `User #${item.user_id}`}
        </Text>
        <Text style={styles.detailText}>
          <Text style={{fontWeight: 'bold'}}>By:</Text> {item.actor_email || (item.changed_by ? `User #${item.changed_by}` : 'System')}
        </Text>
        {item.details && (
          <View style={styles.detailsBox}>
            <Text style={styles.jsonText}>{item.details}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title>Audit Logs</Title>
        <Button icon="refresh" onPress={loadLogs}>Refresh</Button>
      </View>

      <View style={styles.filters}>
        <Searchbar
          placeholder="Search logs..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button mode="outlined" onPress={() => setMenuVisible(true)}>
              {actionFilter || 'All Actions'}
            </Button>
          }
        >
          <Menu.Item onPress={() => { setActionFilter(null); setMenuVisible(false); }} title="All Actions" />
          <Divider />
          <Menu.Item onPress={() => { setActionFilter('CREATE'); setMenuVisible(false); }} title="CREATE" />
          <Menu.Item onPress={() => { setActionFilter('UPDATE'); setMenuVisible(false); }} title="UPDATE" />
          <Menu.Item onPress={() => { setActionFilter('DELETE'); setMenuVisible(false); }} title="DELETE" />
          <Menu.Item onPress={() => { setActionFilter('LOGIN'); setMenuVisible(false); }} title="LOGIN" />
        </Menu>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No logs found matching criteria.</Text>}
        />
      )}
    </View>
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
  filters: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  searchbar: {
    flex: 1,
    elevation: 2,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 12,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionChip: {
    backgroundColor: '#e0e0e0',
    height: 28,
  },
  actionText: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  detailText: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailsBox: {
    marginTop: 8,
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 4,
  },
  jsonText: {
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
  }
});
