import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme, Button, Chip } from 'react-native-paper';
import { Svg, Rect, Text as SvgText, G, Line } from 'react-native-svg';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import type { LabelType, LabelSize, LabelData } from '../../services/labelService';

interface LabelPreviewProps {
  labelType: LabelType;
  labelSize: LabelSize;
  data: LabelData;
  onPrint?: () => void;
  onShare?: () => void;
  compact?: boolean;
}

const SIZE_DIMENSIONS: Record<LabelSize, { width: number; height: number }> = {
  small: { width: 50, height: 25 },
  medium: { width: 70, height: 35 },
  large: { width: 100, height: 50 },
};

const TYPE_LABELS: Record<LabelType, string> = {
  qr: 'Código QR',
  code128: 'Code 128',
  code39: 'Code 39',
  ean13: 'EAN-13',
};

export function LabelPreview({
  labelType,
  labelSize,
  data,
  onPrint,
  onShare,
  compact = false,
}: LabelPreviewProps) {
  const theme = useTheme();
  const dimensions = SIZE_DIMENSIONS[labelSize];
  
  const previewWidth = dimensions.width * 3;
  const previewHeight = dimensions.height * 3;

  const displayText = useMemo(() => {
    const lines: string[] = [];
    if (data.product_name) lines.push(data.product_name.substring(0, 20));
    if (data.sku) lines.push(`SKU: ${data.sku}`);
    if (data.barcode) lines.push(data.barcode.substring(0, 15));
    if (data.location_code) lines.push(`Loc: ${data.location_code}`);
    if (data.batch_number) lines.push(`Lote: ${data.batch_number.substring(0, 12)}`);
    if (data.expiration_date) lines.push(`Exp: ${data.expiration_date}`);
    return lines.length > 0 ? lines : ['Sin datos'];
  }, [data]);

  return (
    <View style={styles.container}>
      <Surface style={[styles.labelContainer, { backgroundColor: Colors.white }]} elevation={2}>
        <View style={styles.header}>
          <Text variant="titleSmall" style={styles.title}>Vista Previa</Text>
          <Chip compact style={styles.typeChip}>{TYPE_LABELS[labelType]}</Chip>
        </View>

        <View style={styles.previewArea}>
          <Svg width={previewWidth} height={previewHeight}>
            <Rect
              x={0}
              y={0}
              width={previewWidth}
              height={previewHeight}
              fill={Colors.white}
              stroke={Colors.border}
              strokeWidth={2}
            />
            
            <G>
              <Rect
                x={10}
                y={10}
                width={previewWidth * 0.4}
                height={previewHeight - 20}
                fill={Colors.light}
                rx={4}
              />
              <SvgText
                x={previewWidth * 0.2}
                y={previewHeight / 2}
                fontSize={14}
                fill={Colors.textSecondary}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {labelType === 'qr' ? 'QR' : '|||'}
              </SvgText>
            </G>

            <G>
              {displayText.slice(0, 4).map((line, index) => (
                <SvgText
                  key={index}
                  x={previewWidth * 0.45}
                  y={20 + index * 12}
                  fontSize={8}
                  fill={Colors.text}
                  textAnchor="start"
                >
                  {line.substring(0, 15)}
                </SvgText>
              ))}
            </G>
          </Svg>
        </View>

        {!compact && (
          <View style={styles.infoContainer}>
            <Text variant="labelSmall" style={styles.infoLabel}>Tamaño:</Text>
            <Text variant="bodySmall">{dimensions.width}mm x {dimensions.height}mm</Text>
          </View>
        )}

        {!compact && (onPrint || onShare) && (
          <View style={styles.actions}>
            {onPrint && (
              <Button
                mode="contained"
                onPress={onPrint}
                icon="printer"
                compact
                style={styles.actionButton}
              >
                Imprimir
              </Button>
            )}
            {onShare && (
              <Button
                mode="outlined"
                onPress={onShare}
                icon="share"
                compact
                style={styles.actionButton}
              >
                Compartir
              </Button>
            )}
          </View>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Layout.spacing.sm,
  },
  labelContainer: {
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  typeChip: {
    backgroundColor: Colors.light,
  },
  previewArea: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.light,
    borderRadius: Layout.borderRadius.sm,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.sm,
    paddingTop: Layout.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoLabel: {
    color: Colors.textSecondary,
    marginRight: Layout.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.spacing.md,
    marginTop: Layout.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

export default LabelPreview;
