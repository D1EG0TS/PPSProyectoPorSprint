import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, Title, ActivityIndicator, Snackbar, Portal, Dialog } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import systemService, { SystemConfig } from '../../../services/systemService';

export default function SystemConfigScreen() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false); // Snackbar
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      key: '',
      value: '',
      description: ''
    }
  });

  const loadConfigs = async () => {
    try {
      const data = await systemService.getConfig();
      setConfigs(data);
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await systemService.updateConfig(data);
      setVisible(true);
      setDialogVisible(false);
      loadConfigs();
      reset();
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (config: SystemConfig) => {
    setEditingConfig(config);
    setValue('key', config.key);
    setValue('value', config.value);
    setValue('description', config.description || '');
    setDialogVisible(true);
  };

  const openNew = () => {
    setEditingConfig(null);
    reset();
    setDialogVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title>System Configuration</Title>
        <Button mode="contained" onPress={openNew} icon="plus">
          Add Config
        </Button>
      </View>

      <ScrollView style={styles.content}>
        {configs.map((config) => (
          <Card key={config.key} style={styles.card} onPress={() => openEdit(config)}>
            <Card.Content>
              <Title>{config.key}</Title>
              <Text style={styles.value}>{config.value}</Text>
              {config.description && <Text style={styles.description}>{config.description}</Text>}
            </Card.Content>
          </Card>
        ))}
        {configs.length === 0 && (
          <Text style={styles.emptyText}>No configurations found. Add one to get started.</Text>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingConfig ? 'Edit Config' : 'New Config'}</Dialog.Title>
          <Dialog.Content>
            <Controller
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Key"
                  mode="outlined"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  disabled={!!editingConfig} // Key cannot be changed once created
                  style={styles.input}
                />
              )}
              name="key"
            />
            <Controller
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Value"
                  mode="outlined"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  style={styles.input}
                />
              )}
              name="value"
            />
            <Controller
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Description"
                  mode="outlined"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                />
              )}
              name="description"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSubmit(onSubmit)} loading={saving}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
      >
        Configuration saved successfully
      </Snackbar>
    </View>
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
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  value: {
    fontFamily: 'monospace',
    backgroundColor: '#eee',
    padding: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  description: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
  }
});
