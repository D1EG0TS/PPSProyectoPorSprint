import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, Divider, Chip } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import type { LayoutCell, OccupancyLevel } from '../../services/warehouseLayoutService';

interface CellDetailModalProps {
  visible: boolean;
  cell: LayoutCell | null;
  onDismiss: () => void;
  onEdit?: () => void;
  onLinkLocation?: () => void;
}

const CELL_TYPE_LABELS: Record<string, string> = {
  zone: 'Zona',
  aisle: 'Pasillo',
  rack: 'Estante',
  shelf: 'Anaquel',
  storage: 'Almacenamiento',
  receiving: 'Recepcion',
  shipping: 'Envio',
  staging: 'Preparacion',
  empty: 'Vacio',
};

const OCCUPANCY_LABELS: Record<OccupancyLevel, { label: string; color: string }> = {
  empty: { label: 'Vacio', color: '#E5E7EB' },
  low: { label: 'Bajo', color: '#86EFAC' },
  medium: { label: 'Medio', color: '#FCD34D' },
  high: { label: 'Alto', color: '#F97316' },
  full: { label: 'Lleno', color: '#EF4444' },
};

export function CellDetailModal({
  visible,
  cell,
  onDismiss,
  onEdit,
  onLinkLocation,
}: CellDetailModalProps) {
  if (!cell) return null;

  const occupancyInfo = OCCUPANCY_LABELS[cell.occupancy_level];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Detalle de Celda
          </Text>
          <Button mode="text" onPress={onDismiss}>Cerrar</Button>
        </View>

        <Divider />

        <View style={styles.content}>
          <View style={styles.row}>
            <Text variant="labelMedium" style={styles.label}>Nombre</Text>
            <Text variant="bodyLarge">{cell.name || 'Sin nombre'}</Text>
          </View>

          <View style={styles.row}>
            <Text variant="labelMedium" style={styles.label}>Posicion</Text>
            <Text variant="bodyLarge">Fila {cell.row + 1}, Columna {cell.col + 1}</Text>
          </View>

          <View style={styles.row}>
            <Text variant="labelMedium" style={styles.label}>Tipo</Text>
            <Chip icon="shape">{CELL_TYPE_LABELS[cell.cell_type]}</Chip>
          </View>

          <View style={styles.row}>
            <Text variant="labelMedium" style={styles.label}>Ocupacion</Text>
            <View style={styles.occupancyContainer}>
              <View style={[styles.occupancyDot, { backgroundColor: occupancyInfo.color }]} />
              <Text variant="bodyLarge">{occupancyInfo.label}</Text>
              <Text variant="bodySmall" style={styles.occupancyPercent}>
                ({cell.occupancy_percentage.toFixed(1)}%)
              </Text>
            </View>
          </View>

          {cell.linked_location_id && (
            <View style={styles.row}>
              <Text variant="labelMedium" style={styles.label}>Ubicacion Vinculada</Text>
              <Text variant="bodyLarge">ID: {cell.linked_location_id}</Text>
              {cell.linked_aisle && (
                <Text variant="bodySmall" style={styles.locationDetail}>
                  Pasillo: {cell.linked_aisle}
                  {cell.linked_rack && ` / Rack: ${cell.linked_rack}`}
                  {cell.linked_shelf && ` / Estante: ${cell.linked_shelf}`}
                </Text>
              )}
            </View>
          )}

          <View style={styles.row}>
            <Text variant="labelMedium" style={styles.label}>Dimensiones</Text>
            <Text variant="bodyLarge">
              {cell.width.toFixed(0)} x {cell.height.toFixed(0)} px
            </Text>
          </View>

          {cell.metadata && Object.keys(cell.metadata).length > 0 && (
            <View style={styles.row}>
              <Text variant="labelMedium" style={styles.label}>Metadatos</Text>
              <View style={styles.metadataContainer}>
                {Object.entries(cell.metadata).map(([key, value]) => (
                  <Chip key={key} compact style={styles.metadataChip}>
                    {key}: {String(value)}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </View>

        <Divider />

        <View style={styles.actions}>
          {onEdit && (
            <Button mode="contained" onPress={onEdit} icon="pencil">
              Editar
            </Button>
          )}
          {onLinkLocation && (
            <Button mode="outlined" onPress={onLinkLocation} icon="link">
              Vincular Ubicacion
            </Button>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: Colors.white,
    margin: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.md,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.md,
  },
  title: {
    fontWeight: 'bold',
  },
  content: {
    padding: Layout.spacing.md,
  },
  row: {
    marginBottom: Layout.spacing.md,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.xs,
  },
  occupancyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  occupancyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Layout.spacing.sm,
  },
  occupancyPercent: {
    marginLeft: Layout.spacing.sm,
    color: Colors.textSecondary,
  },
  locationDetail: {
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.xs,
  },
  metadataChip: {
    backgroundColor: Colors.light,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Layout.spacing.md,
    padding: Layout.spacing.md,
  },
});

export default CellDetailModal;
