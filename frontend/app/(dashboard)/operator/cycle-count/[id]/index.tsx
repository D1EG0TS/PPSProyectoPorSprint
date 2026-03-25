import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Surface, TextInput, IconButton, Divider, ActivityIndicator, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '../../../../../components/ScreenContainer';
import { inventoryService } from '../../../../../services/inventoryService';
import { Colors } from '../../../../../constants/Colors';

interface CycleCountItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  location_id: number;
  location_code: string;
  system_stock: number;
  counted_stock: number | null;
  variance: number | null;
  variance_percentage: number | null;
  notes: string | null;
  counted_by: number | null;
  counted_by_name: string | null;
  counted_at: string | null;
}

interface CycleCountDetail {
  id: number;
  request_number: string;
  warehouse_name: string;
  status: string;
  priority: string;
  total_items: number;
  items_counted: number;
  items_with_variance: number;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  items: CycleCountItem[];
}

export default function CycleCountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [countData, setCountData] = useState<CycleCountDetail | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [countInputs, setCountInputs] = useState<Record<number, string>>({});
  const [notesInputs, setNotesInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await inventoryService.getCycleCountDetail(parseInt(id));
      setCountData(data);
      
      const inputs: Record<number, string> = {};
      const notes: Record<number, string> = {};
      data.items.forEach((item: CycleCountItem) => {
        if (item.counted_stock === null) {
          inputs[item.id] = item.system_stock.toString();
        } else {
          inputs[item.id] = item.counted_stock.toString();
        }
        if (item.notes) {
          notes[item.id] = item.notes;
        }
      });
      setCountInputs(inputs);
      setNotesInputs(notes);
    } catch (error) {
      console.error('Error loading cycle count:', error);
      Alert.alert('Error', 'Error al cargar el conteo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRecordCount = async (item: CycleCountItem) => {
    const countedStock = parseInt(countInputs[item.id] || '0');
    if (isNaN(countedStock) || countedStock < 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    setSaving(item.id);
    try {
      await inventoryService.recordCycleCount(
        parseInt(id!),
        item.id,
        countedStock,
        notesInputs[item.id] || undefined
      );
      Alert.alert('Éxito', 'Conteo registrado');
      loadData();
    } catch (error: any) {
      console.error('Error recording count:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Error al registrar el conteo');
    } finally {
      setSaving(null);
    }
  };

  const handleComplete = async () => {
    if (!countData) return;

    const uncounted = countData.items.filter(i => i.counted_stock === null).length;
    if (uncounted > 0) {
      Alert.alert('Error', `Aún faltan ${uncounted} items por contar`);
      return;
    }

    Alert.alert(
      'Confirmar',
      '¿Estás seguro de completar el conteo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Completar', onPress: async () => {
          try {
            await inventoryService.completeCycleCount(parseInt(id!));
            Alert.alert('Éxito', 'Conteo completado');
            loadData();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Error al completar');
          }
        }},
      ]
    );
  };

  const getVarianceColor = (variance: number | null) => {
    if (variance === null) return Colors.textSecondary;
    if (variance > 0) return Colors.success;
    if (variance < 0) return Colors.danger;
    return Colors.textSecondary;
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (!countData) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text>No se encontró el conteo</Text>
        </View>
      </ScreenContainer>
    );
  }

  const uncountedItems = countData.items.filter(i => i.counted_stock === null).length;
  const itemsWithVariance = countData.items.filter(i => i.variance !== null && i.variance !== 0).length;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text variant="headlineSmall" style={styles.title}>{countData.request_number}</Text>
          <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
            {countData.warehouse_name} - {new Date(countData.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Chip 
          style={{ 
            backgroundColor: countData.status === 'COMPLETED' ? Colors.success + '20' : 
                           countData.status === 'IN_PROGRESS' ? Colors.warning + '20' : 
                           Colors.info + '20' 
          }}
          textStyle={{ 
            color: countData.status === 'COMPLETED' ? Colors.success : 
                   countData.status === 'IN_PROGRESS' ? Colors.warning : 
                   Colors.info 
          }}
        >
          {countData.status.replace('_', ' ')}
        </Chip>
      </View>

      <View style={styles.statsContainer}>
        <Surface style={styles.statCard} elevation={1}>
          <Text variant="titleLarge" style={styles.statValue}>{countData.total_items}</Text>
          <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Total</Text>
        </Surface>
        <Surface style={styles.statCard} elevation={1}>
          <Text variant="titleLarge" style={[styles.statValue, { color: Colors.info }]}>
            {countData.items_counted}
          </Text>
          <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Contados</Text>
        </Surface>
        <Surface style={styles.statCard} elevation={1}>
          <Text variant="titleLarge" style={[styles.statValue, { color: Colors.warning }]}>
            {uncountedItems}
          </Text>
          <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Pendientes</Text>
        </Surface>
        <Surface style={styles.statCard} elevation={1}>
          <Text variant="titleLarge" style={[styles.statValue, { color: itemsWithVariance > 0 ? Colors.danger : Colors.success }]}>
            {itemsWithVariance}
          </Text>
          <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Varianzas</Text>
        </Surface>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${countData.total_items > 0 ? (countData.items_counted / countData.total_items) * 100 : 0}%` }
            ]} 
          />
        </View>
      </View>

      <ScrollView style={styles.itemsList}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Items a Contar</Text>
        
        {countData.items.map((item) => (
          <Card 
            key={item.id} 
            style={[
              styles.itemCard,
              item.counted_stock !== null && styles.itemCardCompleted
            ]}
          >
            <Card.Title
              title={item.product_name}
              subtitle={`SKU: ${item.product_sku} | Ubicación: ${item.location_code}`}
              left={(props) => (
                <View style={[
                  styles.itemStatus,
                  { backgroundColor: item.counted_stock !== null ? Colors.success : Colors.warning }
                ]}>
                  <Text style={styles.itemStatusText}>
                    {item.counted_stock !== null ? '✓' : '○'}
                  </Text>
                </View>
              )}
              right={() => (
                <View style={styles.itemStock}>
                  <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Sistema</Text>
                  <Text variant="titleMedium" style={styles.stockValue}>{item.system_stock}</Text>
                </View>
              )}
            />
            
            {expandedItem === item.id ? (
              <Card.Content>
                <Divider style={{ marginVertical: 8 }} />
                
                <View style={styles.inputRow}>
                  <Text variant="bodyMedium" style={styles.inputLabel}>Cantidad Contada:</Text>
                  <TextInput
                    value={countInputs[item.id] || ''}
                    onChangeText={(text) => setCountInputs({...countInputs, [item.id]: text})}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.countInput}
                    disabled={item.counted_stock !== null && countData.status === 'COMPLETED'}
                  />
                </View>

                {item.counted_stock !== null && item.variance !== null && (
                  <View style={styles.varianceRow}>
                    <Text variant="bodyMedium">Variación:</Text>
                    <Text 
                      variant="titleMedium" 
                      style={{ color: getVarianceColor(item.variance), fontWeight: 'bold' }}
                    >
                      {item.variance > 0 ? '+' : ''}{item.variance}
                      {item.variance_percentage !== null && ` (${item.variance_percentage.toFixed(1)}%)`}
                    </Text>
                  </View>
                )}

                <TextInput
                  label="Notas (opcional)"
                  value={notesInputs[item.id] || ''}
                  onChangeText={(text) => setNotesInputs({...notesInputs, [item.id]: text})}
                  mode="outlined"
                  style={styles.notesInput}
                  disabled={item.counted_stock !== null && countData.status === 'COMPLETED'}
                />

                {item.counted_by_name && (
                  <Text variant="bodySmall" style={{ color: Colors.textSecondary, marginTop: 4 }}>
                    Contado por {item.counted_by_name} el {new Date(item.counted_at!).toLocaleString()}
                  </Text>
                )}

                {countData.status !== 'COMPLETED' && (
                  <Button
                    mode="contained"
                    onPress={() => handleRecordCount(item)}
                    loading={saving === item.id}
                    disabled={saving === item.id}
                    style={styles.recordButton}
                    icon="check"
                  >
                    {item.counted_stock !== null ? 'Actualizar' : 'Registrar Conteo'}
                  </Button>
                )}
              </Card.Content>
            ) : (
              <Card.Actions>
                <Button onPress={() => setExpandedItem(item.id)}>Ver Detalle</Button>
              </Card.Actions>
            )}
          </Card>
        ))}
      </ScrollView>

      {countData.status !== 'COMPLETED' && uncountedItems === 0 && (
        <Surface style={styles.completeSection} elevation={2}>
          <Button
            mode="contained"
            onPress={handleComplete}
            style={styles.completeButton}
            icon="check-all"
          >
            Completar Conteo
          </Button>
        </Surface>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  statValue: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  itemsList: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.text,
  },
  itemCard: {
    marginBottom: 8,
  },
  itemCardCompleted: {
    backgroundColor: Colors.success + '10',
  },
  itemStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemStatusText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  itemStock: {
    alignItems: 'center',
    marginRight: 16,
  },
  stockValue: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    marginRight: 12,
    color: Colors.text,
  },
  countInput: {
    flex: 1,
    maxWidth: 120,
  },
  varianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notesInput: {
    marginBottom: 8,
  },
  recordButton: {
    marginTop: 8,
  },
  completeSection: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  completeButton: {
    backgroundColor: Colors.success,
  },
});
