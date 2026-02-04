import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, Button, List, Avatar } from 'react-native-paper';

export default function BackupScreen() {
  const handleCreateBackup = () => {
    Alert.alert(
      "Create Backup",
      "Are you sure you want to create a new system backup?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Create", onPress: () => Alert.alert("Success", "Backup created successfully (simulated).") }
      ]
    );
  };

  const handleRestore = () => {
    Alert.alert(
      "Restore System",
      "WARNING: This will overwrite all current data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", style: "destructive", onPress: () => Alert.alert("Processing", "Restore process started (simulated).") }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>System Backup & Restore</Title>
      
      <Card style={styles.card}>
        <Card.Title 
          title="Create Backup" 
          left={(props) => <Avatar.Icon {...props} icon="cloud-upload" />}
        />
        <Card.Content>
          <Paragraph>
            Create a full backup of the database and system configuration. 
            The backup file will be downloadable immediately.
          </Paragraph>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={handleCreateBackup}>Create Backup</Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title 
          title="Restore Backup" 
          left={(props) => <Avatar.Icon {...props} icon="cloud-download" />}
        />
        <Card.Content>
          <Paragraph>
            Restore the system from a previous backup file. 
            WARNING: This will overwrite current data.
          </Paragraph>
        </Card.Content>
        <Card.Actions>
          <Button mode="outlined" color="#D32F2F" onPress={handleRestore}>Upload & Restore</Button>
        </Card.Actions>
      </Card>

      <Title style={styles.subtitle}>Recent Backups</Title>
      <List.Section>
        <List.Item
          title="backup_2026-02-04_1000.sql"
          description="Size: 12.5 MB | Auto-generated"
          left={props => <List.Icon {...props} icon="file" />}
          right={props => <Button mode="text">Download</Button>}
        />
        <Divider />
        <List.Item
          title="backup_2026-02-03_2300.sql"
          description="Size: 12.4 MB | Auto-generated"
          left={props => <List.Icon {...props} icon="file" />}
          right={props => <Button mode="text">Download</Button>}
        />
      </List.Section>
    </View>
  );
}

// Simple Divider component since it was missing in imports
const Divider = () => <View style={{height: 1, backgroundColor: '#e0e0e0'}} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 18,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  }
});
