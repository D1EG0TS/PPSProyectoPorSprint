import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { Svg, Rect, G, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import type { LayoutCell, OccupancyLevel } from '../../services/warehouseLayoutService';

interface WarehouseMapProps {
  cells: LayoutCell[];
  gridRows: number;
  gridCols: number;
  cellWidth: number;
  cellHeight: number;
  onCellPress?: (cell: LayoutCell) => void;
  selectedCellId?: number | null;
  showHeatmap?: boolean;
  height?: number;
}

const OCCUPANCY_COLORS: Record<OccupancyLevel, string> = {
  empty: '#E5E7EB',
  low: '#86EFAC',
  medium: '#FCD34D',
  high: '#F97316',
  full: '#EF4444',
};

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

export function WarehouseMap({
  cells,
  gridRows,
  gridCols,
  cellWidth,
  cellHeight,
  onCellPress,
  selectedCellId,
  showHeatmap = false,
  height,
}: WarehouseMapProps) {
  const theme = useTheme();

  const mapWidth = gridCols * cellWidth;
  const mapHeight = height || gridRows * cellHeight;

  const getCellColor = (cell: LayoutCell): string => {
    if (showHeatmap) {
      return OCCUPANCY_COLORS[cell.occupancy_level] || OCCUPANCY_COLORS.empty;
    }
    return CELL_TYPE_COLORS[cell.cell_type] || CELL_TYPE_COLORS.empty;
  };

  const getCellStroke = (cell: LayoutCell): string => {
    if (selectedCellId === cell.id) {
      return Colors.brand;
    }
    return '#9CA3AF';
  };

  const getCellStrokeWidth = (cell: LayoutCell): number => {
    return selectedCellId === cell.id ? 3 : 1;
  };

  const handleCellPress = (cell: LayoutCell) => {
    if (onCellPress) {
      onCellPress(cell);
    }
  };

  const svgContent = useMemo(() => {
    return cells.map((cell) => (
      <G key={cell.id}>
        <Rect
          x={cell.x}
          y={cell.y}
          width={cell.width - 2}
          height={cell.height - 2}
          fill={getCellColor(cell)}
          stroke={getCellStroke(cell)}
          strokeWidth={getCellStrokeWidth(cell)}
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
  }, [cells, selectedCellId, showHeatmap, theme.colors.onSurface]);

  return (
    <View style={styles.container}>
      <Surface style={[styles.mapContainer, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.scrollContainer}>
          <Svg width={mapWidth + 20} height={mapHeight + 20}>
            <Rect x={0} y={0} width={mapWidth + 20} height={mapHeight + 20} fill="#F9FAFB" />
            {svgContent}
          </Svg>
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.spacing.md,
  },
  mapContainer: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  scrollContainer: {
    padding: Layout.spacing.sm,
  },
});

export default WarehouseMap;
