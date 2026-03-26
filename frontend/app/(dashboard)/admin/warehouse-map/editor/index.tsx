import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, useTheme, Button, TextInput, Portal, Dialog } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { MapEditor } from '../../../../components/warehouse/MapEditor';
import { warehouseLayoutService, LayoutCell, WarehouseLayout, UpdateCellRequest } from '../../../../services/warehouseLayoutService';
import { warehouseService, Warehouse } from '../../../../services/warehouseService';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';

export default function WarehouseMapEditorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ warehouseId?: string; layoutId?: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [layout, setLayout] = useState<WarehouseLayout | null>(null);
  const [cells, setCells] = useState<LayoutCell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [layoutName, setLayoutName] = useState('');
  const [layoutDescription, setLayoutDescription] = useState('');
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [newRows, setNewRows] = useState('10');
  const [newCols, setNewCols] = useState('10');

  const isNewLayout = !params.layoutId;

  const loadWarehouse = useCallback(async () => {
    if (params.warehouseId) {
      try {
        const warehouses = await warehouseService.getWarehouses();
        const wh = warehouses.find(w => w.id === parseInt(params.warehouseId!, 10));
        if (wh) {
          setWarehouse(wh);
          setLayoutName(`${wh.name} - Layout`);
        }
      } catch (error) {
        console.error('Error loading warehouse:', error);
      }
    }
  }, [params.warehouseId]);

  const loadLayout = useCallback(async () => {
    if (!params.layoutId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await warehouseLayoutService.getLayout(parseInt(params.layoutId!, 10));
      setLayout(data);
      setCells(data.cells);
      setLayoutName(data.name);
      setLayoutDescription(data.description || '');
    } catch (error) {
      console.error('Error loading layout:', error);
      Alert.alert('Error', 'No se pudo cargar el layout');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [params.layoutId, router]);

  useEffect(() => {
    const init = async () => {
      await loadWarehouse();
      await loadLayout();
    };
    init();
  }, [loadWarehouse, loadLayout]);

  const handleCellSelect = (cell: LayoutCell) => {
    setSelectedCellId(cell.id);
  };

  const handleCellUpdate = async (cellId: number, updates: UpdateCellRequest) => {
    try {
      const updated = await warehouseLayoutService.updateCell(layout!.id, cellId, updates);
      setCells(prev => prev.map(c => c.id === cellId ? updated : c));
      setSelectedCellId(null);
    } catch (error) {
      console.error('Error updating cell:', error);
      Alert.alert('Error', 'No se pudo actualizar la celda');
    }
  };

  const handleCellDelete = async (cellId: number) => {
    Alert.alert(
      'Eliminar Celda',
      '¿Estás seguro de eliminar esta celda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await warehouseLayoutService.deleteCell(layout!.id, cellId);
              setCells(prev => prev.filter(c => c.id !== cellId));
              setSelectedCellId(null);
            } catch (error) {
              console.error('Error deleting cell:', error);
              Alert.alert('Error', 'No se pudo eliminar la celda');
            }
          },
        },
      ]
    );
  };

  const handleGenerateLayout = async (rows: number, cols: number) => {
    if (!layout) {
      Alert.alert('Error', 'Primero debes crear el layout');
      return;
    }

    setSaving(true);
    try {
      const generatedCells = await warehouseLayoutService.generateLayout(layout.id, { rows, cols });
      setCells(generatedCells);
      setSelectedCellId(null);
    } catch (error) {
      console.error('Error generating layout:', error);
      Alert.alert('Error', 'No se pudo generar el layout');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLayout = async () => {
    if (!warehouse) {
      Alert.alert('Error', 'Selecciona un almacén primero');
      return;
    }

    const rows = parseInt(newRows, 10);
    const cols = parseInt(newCols, 10);

    if (rows < 1 || rows > 50 || cols < 1 || cols > 50) {
      Alert.alert('Error', 'Las filas y columnas deben estar entre 1 y 50');
      return;
    }

    setSaving(true);
    try {
      const newLayout = await warehouseLayoutService.createLayout({
        warehouse_id: warehouse.id,
        name: layoutName || `${warehouse.name} - Layout`,
        description: layoutDescription,
        grid_rows: rows,
        grid_cols: cols,
      });

      const generatedCells = await warehouseLayoutService.generateLayout(newLayout.id, { rows, cols });
      
      setLayout(newLayout);
      setCells(generatedCells);
      setCreateDialogVisible(false);
    } catch (error: any) {
      console.error('Error creating layout:', error);
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo crear el layout');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!layout) return;

    try {
      const updated = await warehouseLayoutService.updateLayout(layout.id, {
        name: layoutName,
        description: layoutDescription || undefined,
      });
      setLayout(updated);
      Alert.alert('Éxito', 'Layout actualizado correctamente');
    } catch (error) {
      console.error('Error saving layout:', error);
      Alert.alert('Error', 'No se pudo guardar el layout');
    }
  };

  const handleGoBack = () => {
    if (cells.length === 0 && isNewLayout) {
      Alert.alert(
        'Layout vacío',
        '¿Estás seguro de salir sin guardar?',
        [
          { text: 'Quedarse', style: 'cancel' },
          { text: 'Salir', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isNewLayout && !warehouse) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Selecciona un almacén primero</Text>
          <Button mode="contained" onPress={() => router.back()}>
            Volver
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button
          mode="text"
          onPress={handleGoBack}
          icon="arrow-left"
        >
          Volver
        </Button>
        <View style={styles.headerSpacer} />
        <Text variant="titleMedium" style={styles.headerTitle} numberOfLines={1}>
          {layout?.name || 'Nuevo Layout'}
        </Text>
        <View style={styles.headerSpacer} />
        {layout && (
          <Button
            mode="contained"
            onPress={handleSaveName}
            compact
          >
            Guardar
          </Button>
        )}
      </View>

      {!layout ? (
        <View style={styles.createContainer}>
          <Text variant="headlineSmall" style={styles.createTitle}>
            Crear Nuevo Layout
          </Text>
          <Text variant="bodyMedium" style={styles.createSubtitle}>
            para {warehouse?.name}
          </Text>

          <View style={styles.formContainer}>
            <TextInput
              label="Nombre del Layout"
              value={layoutName}
              onChangeText={setLayoutName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Descripcion (opcional)"
              value={layoutDescription}
              onChangeText={setLayoutDescription}
              mode="outlined"
              style={styles.input}
              multiline
            />
          </View>

          <Button
            mode="outlined"
            onPress={() => setCreateDialogVisible(true)}
            icon="grid"
            style={styles.createButton}
          >
            Configurar Grid
          </Button>

          <Button
            mode="contained"
            onPress={handleCreateLayout}
            disabled={saving || !layoutName.trim()}
            loading={saving}
            style={styles.createButton}
          >
            Crear Layout
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.nameHeader}>
            <TextInput
              label="Nombre"
              value={layoutName}
              onChangeText={setLayoutName}
              mode="outlined"
              style={styles.nameInput}
            />
          </View>

          <MapEditor
            cells={cells}
            gridRows={layout.grid_rows}
            gridCols={layout.grid_cols}
            cellWidth={layout.cell_width}
            cellHeight={layout.cell_height}
            selectedCellId={selectedCellId}
            onCellSelect={handleCellSelect}
            onCellUpdate={handleCellUpdate}
            onCellDelete={handleCellDelete}
            onGenerateLayout={handleGenerateLayout}
            isLoading={saving}
          />
        </>
      )}

      <Portal>
        <Dialog visible={createDialogVisible} onDismiss={() => setCreateDialogVisible(false)}>
          <Dialog.Title>Configurar Grid</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Define el tamaño del grid inicial para el layout.
            </Text>
            <View style={styles.gridInputs}>
              <TextInput
                label="Filas"
                value={newRows}
                onChangeText={setNewRows}
                keyboardType="numeric"
                mode="outlined"
                style={styles.gridInput}
              />
              <TextInput
                label="Columnas"
                value={newCols}
                onChangeText={setNewCols}
                keyboardType="numeric"
                mode="outlined"
                style={styles.gridInput}
              />
            </View>
            <Text variant="bodySmall" style={styles.gridHint}>
              Maximo: 50 filas x 50 columnas
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>Cancelar</Button>
            <Button onPress={() => {
              setCreateDialogVisible(false);
              setLayoutName(layoutName || `${warehouse?.name} - Layout`);
            }}>Aplicar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitle: {
    flex: 3,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.lg,
  },
  loadingText: {
    marginVertical: Layout.spacing.md,
    color: Colors.textSecondary,
  },
  createContainer: {
    flex: 1,
    padding: Layout.spacing.lg,
    justifyContent: 'center',
  },
  createTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: Layout.spacing.sm,
  },
  createSubtitle: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.xl,
  },
  formContainer: {
    marginBottom: Layout.spacing.lg,
  },
  input: {
    marginBottom: Layout.spacing.md,
  },
  createButton: {
    marginTop: Layout.spacing.md,
  },
  nameHeader: {
    padding: Layout.spacing.md,
    backgroundColor: Colors.white,
  },
  nameInput: {
    backgroundColor: Colors.white,
  },
  dialogText: {
    marginBottom: Layout.spacing.md,
    color: Colors.textSecondary,
  },
  gridInputs: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  gridInput: {
    flex: 1,
  },
  gridHint: {
    marginTop: Layout.spacing.sm,
    color: Colors.textSecondary,
  },
});
