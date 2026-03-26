import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, useTheme, ActivityIndicator, Chip } from 'react-native-paper';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Card } from '../../../../components/Card';
import { LabelPreview } from '../../../../components/labels/LabelPreview';
import { labelService, LabelType, LabelSize, LabelData } from '../../../../services/labelService';
import { Colors } from '../../../../constants/Colors';
import { Layout } from '../../../../constants/Layout';

const LABEL_TYPES: { value: LabelType; label: string }[] = [
  { value: 'qr', label: 'QR' },
  { value: 'code128', label: 'Code 128' },
  { value: 'code39', label: 'Code 39' },
  { value: 'ean13', label: 'EAN-13' },
];

const LABEL_SIZES: { value: LabelSize; label: string }[] = [
  { value: 'small', label: '50x25mm' },
  { value: 'medium', label: '70x35mm' },
  { value: 'large', label: '100x50mm' },
];

export default function LabelGeneratorScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [labelType, setLabelType] = useState<LabelType>('qr');
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [data, setData] = useState<LabelData>({
    product_name: '',
    sku: '',
    barcode: '',
    location_code: '',
    batch_number: '',
    expiration_date: '',
  });

  const handlePrint = useCallback(async () => {
    if (!data.sku && !data.barcode && !data.product_name) {
      Alert.alert('Error', 'Ingresa al menos un identificador (SKU, barcode o nombre)');
      return;
    }

    setLoading(true);
    try {
      const url = labelService.generateProductLabelUrl(0, undefined, labelType);
      const customData = { ...data };
      delete customData.product_id;
      
      await labelService.printFromUrl(url);
    } catch (error: any) {
      console.error('Print error:', error);
      Alert.alert('Error', 'No se pudo imprimir la etiqueta');
    } finally {
      setLoading(false);
    }
  }, [data, labelType]);

  const handleShare = useCallback(async () => {
    if (!data.sku && !data.barcode && !data.product_name) {
      Alert.alert('Error', 'Ingresa al menos un identificador');
      return;
    }

    setLoading(true);
    try {
      const url = labelService.generateProductLabelUrl(0, undefined, labelType);
      await labelService.sharePdf(url);
    } catch (error: any) {
      console.error('Share error:', error);
      Alert.alert('Error', 'No se pudo compartir la etiqueta');
    } finally {
      setLoading(false);
    }
  }, [data, labelType]);

  const updateField = (field: keyof LabelData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.content}>
        <Card title="Generador de Etiquetas" subtitle="Crea e imprime etiquetas personalizadas">
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionTitle}>Tipo de Codigo</Text>
            <SegmentedButtons
              value={labelType}
              onValueChange={(value) => setLabelType(value as LabelType)}
              buttons={LABEL_TYPES}
              style={styles.segmented}
            />
          </View>

          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionTitle}>Tamano de Etiqueta</Text>
            <SegmentedButtons
              value={labelSize}
              onValueChange={(value) => setLabelSize(value as LabelSize)}
              buttons={LABEL_SIZES}
              style={styles.segmented}
            />
          </View>

          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionTitle}>Datos de la Etiqueta</Text>
            
            <TextInput
              label="Nombre del Producto"
              value={data.product_name}
              onChangeText={(v) => updateField('product_name', v)}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="SKU"
              value={data.sku}
              onChangeText={(v) => updateField('sku', v)}
              mode="outlined"
              style={styles.input}
              placeholder="Ej: SKU-001"
            />
            
            <TextInput
              label="Codigo de Barras"
              value={data.barcode}
              onChangeText={(v) => updateField('barcode', v)}
              mode="outlined"
              style={styles.input}
              placeholder="Ej: 1234567890"
            />
            
            <TextInput
              label="Codigo de Ubicacion"
              value={data.location_code}
              onChangeText={(v) => updateField('location_code', v)}
              mode="outlined"
              style={styles.input}
              placeholder="Ej: A-01-01"
            />
            
            <TextInput
              label="Numero de Lote"
              value={data.batch_number}
              onChangeText={(v) => updateField('batch_number', v)}
              mode="outlined"
              style={styles.input}
              placeholder="Ej: LOTE-2024-001"
            />
            
            <TextInput
              label="Fecha de Vencimiento"
              value={data.expiration_date}
              onChangeText={(v) => updateField('expiration_date', v)}
              mode="outlined"
              style={styles.input}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </Card>

        <Card>
          <LabelPreview
            labelType={labelType}
            labelSize={labelSize}
            data={data}
            onPrint={handlePrint}
            onShare={handleShare}
          />
        </Card>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handlePrint}
            icon="printer"
            disabled={loading}
            loading={loading}
            style={styles.actionButton}
          >
            Imprimir
          </Button>
          <Button
            mode="outlined"
            onPress={handleShare}
            icon="share"
            disabled={loading}
            style={styles.actionButton}
          >
            Compartir
          </Button>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    marginBottom: Layout.spacing.sm,
    fontWeight: 'bold',
    color: Colors.text,
  },
  segmented: {
    marginBottom: Layout.spacing.sm,
  },
  input: {
    marginBottom: Layout.spacing.sm,
    backgroundColor: Colors.white,
  },
  actions: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
});
