import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, useTheme, FAB, Menu, Button, SegmentedButtons, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Card } from '../../../../components/Card';
import { EmptyState } from '../../../../components/EmptyState';
import { WarehouseMap } from '../../../../components/warehouse/WarehouseMap';
import { CellDetailModal } from '../../../../components/warehouse/CellDetailModal';
import { warehouseLayoutService, LayoutCell, WarehouseLayout } from '../../../../services/warehouseLayoutService';
import { warehouseService, Warehouse } from '../../../../services/warehouseService';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';

export default function WarehouseMapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [layout, setLayout] = useState<WarehouseLayout | null>(null);
  const [selectedCell, setSelectedCell] = useState<LayoutCell | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadWarehouses = useCallback(async () => {
    try {
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0]);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  }, [selectedWarehouse]);

  const loadLayout = useCallback(async () => {
    if (!selectedWarehouse) return;
    
    setLoading(true);
    try {
      const data = await warehouseLayoutService.getLayoutByWarehouse(selectedWarehouse.id);
      setLayout(data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setLayout(null);
      } else {
        console.error('Error loading layout:', error);
        Alert.alert('Error', 'No se pudo cargar el layout');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      loadLayout();
    }
  }, [selectedWarehouse, loadLayout]);

  const handleCellPress = (cell: LayoutCell) => {
    setSelectedCell(cell);
  };

  const handleCreateLayout = () => {
    if (!selectedWarehouse) return;
    router.push(`/admin/warehouse-map/editor?warehouseId=${selectedWarehouse.id}`);
  };

  const handleEditLayout = () => {
    if (!layout) return;
    router.push(`/admin/warehouse-map/editor?layoutId=${layout.id}`);
  };

  const handleRefresh = () => {
    loadLayout();
  };

  const toggleHeatmap = (value: string) => {
    setShowHeatmap(value === 'heatmap');
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand} />
          <Text style={styles.loadingText}>Cargando layout...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              icon="warehouse"
              contentStyle={styles.warehouseButton}
            >
              {selectedWarehouse?.name || 'Seleccionar Almacén'}
            </Button>
          }
        >
          {warehouses.map((wh) => (
            <Menu.Item
              key={wh.id}
              onPress={() => {
                setSelectedWarehouse(wh);
                setMenuVisible(false);
              }}
              title={wh.name}
              leadingIcon={wh.id === selectedWarehouse?.id ? 'check' : undefined}
            />
          ))}
        </Menu>

        {layout && (
          <SegmentedButtons
            value={showHeatmap ? 'heatmap' : 'normal'}
            onValueChange={toggleHeatmap}
            buttons={[
              { value: 'normal', label: 'Normal' },
              { value: 'heatmap', label: 'Ocupación' },
            ]}
            style={styles.segmented}
          />
        )}
      </View>

      {!layout ? (
        <EmptyState
          title="Sin Layout"
          description={`${selectedWarehouse?.name || 'Este almacén'} no tiene un layout configurado.`}
          actionLabel="Crear Layout"
          onAction={handleCreateLayout}
        />
      ) : (
        <ScrollView style={styles.content}>
          <Card title={layout.name} subtitle={layout.description || 'Mapa del almacén'}>
            <View style={styles.mapContainer}>
              <WarehouseMap
                cells={layout.cells}
                gridRows={layout.grid_rows}
                gridCols={layout.grid_cols}
                cellWidth={layout.cell_width}
                cellHeight={layout.cell_height}
                onCellPress={handleCellPress}
                selectedCellId={selectedCell?.id}
                showHeatmap={showHeatmap}
              />
            </View>

            <View style={styles.legendContainer}>
              <Text variant="labelMedium" style={styles.legendTitle}>Leyenda:</Text>
              <View style={styles.legendItems}>
                <Chip compact style={[styles.legendChip, { backgroundColor: '#93C5FD' }]}>Zona</Chip>
                <Chip compact style={[styles.legendChip, { backgroundColor: '#D1D5DB' }]}>Pasillo</Chip>
                <Chip compact style={[styles.legendChip, { backgroundColor: '#A78BFA' }]}>Estante</Chip>
                <Chip compact style={[styles.legendChip, { backgroundColor: '#86EFAC' }]}>Almacén</Chip>
                <Chip compact style={[styles.legendChip, { backgroundColor: '#FCD34D' }]}>Recepción</Chip>
                <Chip compact style={[styles.legendChip, { backgroundColor: '#F87171' }]}>Envío</Chip>
              </View>
            </View>
          </Card>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text variant="headlineMedium" style={styles.statValue}>{layout.grid_rows * layout.grid_cols}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Celdas Totales</Text>
            </View>
            <View style={styles.statCard}>
              <Text variant="headlineMedium" style={styles.statValue}>{layout.cells.filter(c => c.cell_type !== 'empty').length}</Text>
              <Text variant="labelMedium" style={styles.statLabel}>Celdas Activas</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <FAB
        icon="pencil"
        style={[styles.fab, { backgroundColor: Colors.brand }]}
        onPress={layout ? handleEditLayout : handleCreateLayout}
        label={layout ? 'Editar' : 'Crear'}
      />

      <CellDetailModal
        visible={!!selectedCell}
        cell={selectedCell}
        onDismiss={() => setSelectedCell(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    gap: Layout.spacing.md,
  },
  warehouseButton: {
    flexDirection: 'row-reverse',
  },
  segmented: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 400,
    marginVertical: Layout.spacing.md,
  },
  legendContainer: {
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendTitle: {
    marginBottom: Layout.spacing.sm,
    color: Colors.textSecondary,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.xs,
  },
  legendChip: {
    height: 28,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Layout.spacing.md,
    gap: Layout.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontWeight: 'bold',
    color: Colors.brand,
  },
  statLabel: {
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
  },
  fab: {
    position: 'absolute',
    margin: Layout.spacing.md,
    right: 0,
    bottom: 0,
  },
});
