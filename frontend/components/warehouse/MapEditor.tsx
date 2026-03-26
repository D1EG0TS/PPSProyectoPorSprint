import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { Text, useTheme, Surface, IconButton, SegmentedButtons, Button, Portal, Dialog, TextInput } from 'react-native-paper';
import { Svg, Rect, G, Text as SvgText, Line } from 'react-native-svg';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import type { LayoutCell, CellType, UpdateCellRequest } from '../../services/warehouseLayoutService';

interface MapEditorProps {
  cells: LayoutCell[];
  gridRows: number;
  gridCols: number;
  cellWidth: number;
  cellHeight: number;
  selectedCellId: number | null;
  onCellSelect: (cell: LayoutCell) => void;
  onCellUpdate: (cellId: number, updates: UpdateCellRequest) => void;
  onCellDelete: (cellId: number) => void;
  onGenerateLayout: (rows: number, cols: number) => void;
  isLoading?: boolean;
}

const CELL_TYPE_OPTIONS: { value: CellType; label: string }[] = [
  { value: 'empty', label: 'Vacío' },
  { value: 'zone', label: 'Zona' },
  { value: 'aisle', label: 'Pasillo' },
  { value: 'rack', label: 'Estante' },
  { value: 'shelf', label: 'Anaquel' },
  { value: 'storage', label: 'Almacenamiento' },
  { value: 'receiving', label: 'Recepción' },
  { value: 'shipping', label: 'Envío' },
  { value: 'staging', label: 'Preparación' },
];

const CELL_TYPE_COLORS: Record<string, string> = {
  zone: '#93C5FD',
  aisle: '#D1D5DB',
  rack: '#A78BFA',
  shelf: '#F9A8D4',
  storage: '#86EFAC',
  receiving: '#FCD34D',
  shipping: '#F87171',
  staging: '#A5B4FC',
  empty: '#E5E7EB',
};

const CELL_TYPE_LABELS: Record<string, string> = {
  zone: 'Z',
  aisle: 'A',
  rack: 'R',
  shelf: 'S',
  storage: 'ST',
  receiving: 'RC',
  shipping: 'SH',
  staging: 'SG',
  empty: '',
};

export function MapEditor({
  cells,
  gridRows,
  gridCols,
  cellWidth,
  cellHeight,
  selectedCellId,
  onCellSelect,
  onCellUpdate,
  onCellDelete,
  onGenerateLayout,
  isLoading = false,
}: MapEditorProps) {
  const theme = useTheme();
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [generateDialogVisible, setGenerateDialogVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<CellType>('empty');
  const [generateRows, setGenerateRows] = useState(gridRows.toString());
  const [generateCols, setGenerateCols] = useState(gridCols.toString());

  const lastOffset = useRef({ x: 0, y: 0 });
  const lastScale = useRef(1);

  const mapWidth = gridCols * cellWidth;
  const mapHeight = gridRows * cellHeight;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastOffset.current = { x: offset.x, y: offset.y };
      },
      onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        setOffset({
          x: lastOffset.current.x + gestureState.dx,
          y: lastOffset.current.y + gestureState.dy,
        });
      },
      onPanResponderRelease: () => {
        lastOffset.current = offset;
      },
    })
  ).current;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleCellPress = (cell: LayoutCell) => {
    onCellSelect(cell);
  };

  const handleOpenEditDialog = () => {
    const selectedCell = cells.find((c) => c.id === selectedCellId);
    if (selectedCell) {
      setEditName(selectedCell.name || '');
      setEditType(selectedCell.cell_type);
      setEditDialogVisible(true);
    }
  };

  const handleSaveCell = () => {
    if (selectedCellId) {
      onCellUpdate(selectedCellId, {
        name: editName || undefined,
        cell_type: editType,
      });
    }
    setEditDialogVisible(false);
  };

  const handleDeleteCell = () => {
    if (selectedCellId) {
      onCellDelete(selectedCellId);
    }
  };

  const handleGenerate = () => {
    const rows = parseInt(generateRows, 10);
    const cols = parseInt(generateCols, 10);
    if (rows > 0 && cols > 0 && rows <= 50 && cols <= 50) {
      onGenerateLayout(rows, cols);
    }
    setGenerateDialogVisible(false);
  };

  const renderCells = () => {
    return cells.map((cell) => (
      <G key={cell.id}>
        <Rect
          x={cell.x}
          y={cell.y}
          width={cell.width - 2}
          height={cell.height - 2}
          fill={CELL_TYPE_COLORS[cell.cell_type] || CELL_TYPE_COLORS.empty}
          stroke={selectedCellId === cell.id ? Colors.brand : '#9CA3AF'}
          strokeWidth={selectedCellId === cell.id ? 3 : 1}
          rx={4}
          ry={4}
          onPress={() => handleCellPress(cell)}
        />
        {cell.name && (
          <SvgText
            x={cell.x + cell.width / 2}
            y={cell.y + cell.height / 2}
            fontSize={10}
            fill={theme.colors.onSurface}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontWeight="bold"
          >
            {cell.name.substring(0, 8)}
          </SvgText>
        )}
        {cell.cell_type !== 'empty' && !cell.name && (
          <SvgText
            x={cell.x + cell.width / 2}
            y={cell.y + cell.height / 2}
            fontSize={12}
            fill={theme.colors.onSurface}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontWeight="bold"
          >
            {CELL_TYPE_LABELS[cell.cell_type] || ''}
          </SvgText>
        )}
      </G>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <IconButton icon="magnify-plus" onPress={handleZoomIn} />
        <IconButton icon="magnify-minus" onPress={handleZoomOut} />
        <IconButton icon="fit-to-screen" onPress={handleResetView} />
        <View style={styles.spacer} />
        <Button
          mode="outlined"
          onPress={() => setGenerateDialogVisible(true)}
          icon="grid"
          compact
        >
          Generar Grid
        </Button>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollHorizontal}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollVertical}
          {...panResponder.panHandlers}
        >
          <View style={[styles.mapWrapper, { transform: [{ scale }] }]}>
            <Svg width={mapWidth + 20} height={mapHeight + 20}>
              <Rect x={0} y={0} width={mapWidth + 20} height={mapHeight + 20} fill="#F9FAFB" />
              {renderCells()}
              {Array.from({ length: gridRows + 1 }).map((_, i) => (
                <Line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * cellHeight}
                  x2={mapWidth}
                  y2={i * cellHeight}
                  stroke="#E5E7EB"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: gridCols + 1 }).map((_, i) => (
                <Line
                  key={`v-${i}`}
                  x1={i * cellWidth}
                  y1={0}
                  x2={i * cellWidth}
                  y2={mapHeight}
                  stroke="#E5E7EB"
                  strokeWidth={1}
                />
              ))}
            </Svg>
          </View>
        </ScrollView>
      </ScrollView>

      {selectedCellId && (
        <Surface style={styles.editPanel} elevation={2}>
          <Text variant="titleMedium" style={styles.panelTitle}>Celda Seleccionada</Text>
          <View style={styles.editActions}>
            <Button mode="contained" onPress={handleOpenEditDialog} icon="pencil">
              Editar
            </Button>
            <Button mode="outlined" onPress={handleDeleteCell} icon="delete" textColor={Colors.danger}>
              Eliminar
            </Button>
          </View>
        </Surface>
      )}

      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Editar Celda</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nombre"
              value={editName}
              onChangeText={setEditName}
              mode="outlined"
              style={styles.input}
            />
            <Text variant="labelLarge" style={styles.typeLabel}>Tipo de Celda</Text>
            <SegmentedButtons
              value={editType}
              onValueChange={(value) => setEditType(value as CellType)}
              buttons={CELL_TYPE_OPTIONS.slice(0, 5).map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              style={styles.segmented}
            />
            <SegmentedButtons
              value={editType}
              onValueChange={(value) => setEditType(value as CellType)}
              buttons={CELL_TYPE_OPTIONS.slice(5).map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              style={styles.segmented}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleSaveCell}>Guardar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={generateDialogVisible} onDismiss={() => setGenerateDialogVisible(false)}>
          <Dialog.Title>Generar Nuevo Grid</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Esto eliminará todas las celdas existentes y creará un nuevo grid.
            </Text>
            <View style={styles.gridInputs}>
              <TextInput
                label="Filas"
                value={generateRows}
                onChangeText={setGenerateRows}
                keyboardType="numeric"
                mode="outlined"
                style={styles.gridInput}
              />
              <TextInput
                label="Columnas"
                value={generateCols}
                onChangeText={setGenerateCols}
                keyboardType="numeric"
                mode="outlined"
                style={styles.gridInput}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setGenerateDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleGenerate}>Generar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  spacer: {
    flex: 1,
  },
  scrollHorizontal: {
    flex: 1,
  },
  scrollVertical: {
    flex: 1,
  },
  mapWrapper: {
    margin: Layout.spacing.md,
  },
  editPanel: {
    padding: Layout.spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  panelTitle: {
    marginBottom: Layout.spacing.sm,
    fontWeight: 'bold',
  },
  editActions: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  input: {
    marginBottom: Layout.spacing.md,
  },
  typeLabel: {
    marginBottom: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
  },
  segmented: {
    marginBottom: Layout.spacing.sm,
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
});

export default MapEditor;
