import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, SegmentedButtons, useTheme, HelperText } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { warehouseService, Location, BatchLocationCreate, LocationHierarchy } from '../../services/warehouseService';

interface BatchCreateModalProps {
  visible: boolean;
  onDismiss: () => void;
  onCreated: () => void;
  warehouseId: number;
  parentLocation?: Location | null;
  existingAisles?: string[];
}

const LOCATION_TYPES = [
  { value: 'zone', label: 'Zona' },
  { value: 'aisle', label: 'Pasillo' },
  { value: 'rack', label: 'Estantería' },
  { value: 'shelf', label: 'Fila' },
  { value: 'bin', label: 'Contenedor' },
];

export const BatchCreateModal: React.FC<BatchCreateModalProps> = ({
  visible,
  onDismiss,
  onCreated,
  warehouseId,
  parentLocation,
  existingAisles = [],
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [prefix, setPrefix] = useState('C-');
  const [startNumber, setStartNumber] = useState('1');
  const [count, setCount] = useState('10');
  const [nameTemplate, setNameTemplate] = useState('Contenedor {n}');
  const [locationType, setLocationType] = useState('bin');
  const [aisle, setAisle] = useState('');
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [positionPrefix, setPositionPrefix] = useState('P-');
  const [capacity, setCapacity] = useState('100');
  const [barcodePrefix, setBarcodePrefix] = useState('');
  const [hierarchy, setHierarchy] = useState<LocationHierarchy | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadHierarchy = async (selectedAisle?: string, selectedRack?: string, selectedShelf?: string) => {
    try {
      const data = await warehouseService.getLocationHierarchy(
        warehouseId,
        selectedAisle || aisle || undefined,
        selectedRack || rack || undefined,
        selectedShelf || shelf || undefined
      );
      setHierarchy(data);
    } catch (error) {
      console.error('Error loading hierarchy:', error);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!prefix.trim()) {
      newErrors.prefix = 'El prefijo es requerido';
    }
    if (!startNumber || isNaN(Number(startNumber)) || Number(startNumber) < 0) {
      newErrors.startNumber = 'Número inicial inválido';
    }
    if (!count || isNaN(Number(count)) || Number(count) < 1 || Number(count) > 100) {
      newErrors.count = 'Cantidad debe ser entre 1 y 100';
    }
    if (!nameTemplate.trim()) {
      newErrors.nameTemplate = 'El template de nombre es requerido';
    }
    if (capacity && isNaN(Number(capacity))) {
      newErrors.capacity = 'Capacidad debe ser un número';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const data: BatchLocationCreate = {
        parent_location_id: parentLocation?.id || null,
        location_type: locationType,
        prefix: prefix.trim(),
        start_number: parseInt(startNumber, 10),
        count: parseInt(count, 10),
        name_template: nameTemplate.trim(),
        aisle: aisle.trim() || undefined,
        rack: rack.trim() || undefined,
        shelf: shelf.trim() || undefined,
        position_prefix: positionPrefix.trim() || undefined,
        capacity: parseInt(capacity, 10) || 0,
        barcode_prefix: barcodePrefix.trim() || undefined,
      };

      const result = await warehouseService.createLocationsBatch(warehouseId, data);

      if (result.errors.length > 0) {
        Toast.show({
          type: 'warning',
          text1: `Creadas ${result.created} ubicaciones`,
          text2: result.errors.slice(0, 2).join(', '),
        });
      } else {
        Toast.show({
          type: 'success',
          text1: `${result.created} ubicaciones creadas`,
        });
      }

      onCreated();
      handleDismiss();
    } catch (error: any) {
      console.error('Error creating locations:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.detail || 'No se pudieron crear las ubicaciones',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setPrefix('C-');
    setStartNumber('1');
    setCount('10');
    setNameTemplate('Contenedor {n}');
    setLocationType('bin');
    setAisle('');
    setRack('');
    setShelf('');
    setPositionPrefix('P-');
    setCapacity('100');
    setBarcodePrefix('');
    setErrors({});
    onDismiss();
  };

  const previewCodes = () => {
    const start = parseInt(startNumber, 10) || 0;
    const total = parseInt(count, 10) || 0;
    const codes = [];
    for (let i = 0; i < Math.min(total, 5); i++) {
      codes.push(`${prefix.trim()}${String(start + i).padStart(3, '0')}`);
    }
    if (total > 5) {
      codes.push(`... y ${total - 5} más`);
    }
    return codes.join(', ');
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="headlineSmall" style={styles.title}>
            Crear Ubicaciones en Lote
          </Text>

          {parentLocation && (
            <View style={[styles.parentInfo, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                Ubicación padre: {parentLocation.path || parentLocation.code}
              </Text>
            </View>
          )}

          <Text variant="titleMedium" style={styles.sectionTitle}>Tipo de ubicación</Text>
          <SegmentedButtons
            value={locationType}
            onValueChange={setLocationType}
            buttons={LOCATION_TYPES}
            style={styles.segmented}
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>Codificación</Text>
          <View style={styles.row}>
            <TextInput
              label="Prefijo"
              value={prefix}
              onChangeText={setPrefix}
              style={[styles.flex1, { backgroundColor: theme.colors.surface }]}
              mode="outlined"
              dense
              error={!!errors.prefix}
            />
            <TextInput
              label="Desde"
              value={startNumber}
              onChangeText={setStartNumber}
              keyboardType="numeric"
              style={[styles.flex1, { backgroundColor: theme.colors.surface, marginHorizontal: 8 }]}
              mode="outlined"
              dense
              error={!!errors.startNumber}
            />
            <TextInput
              label="Cantidad"
              value={count}
              onChangeText={setCount}
              keyboardType="numeric"
              style={[styles.flex1, { backgroundColor: theme.colors.surface }]}
              mode="outlined"
              dense
              error={!!errors.count}
            />
          </View>

          <TextInput
            label="Template de nombre"
            value={nameTemplate}
            onChangeText={setNameTemplate}
            placeholder="Usa {n} para el número (ej: Contenedor {n})"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            mode="outlined"
            error={!!errors.nameTemplate}
          />
          <HelperText type="info">
            Preview: {previewCodes()}
          </HelperText>

          <Text variant="titleMedium" style={styles.sectionTitle}>Coordenadas (opcional)</Text>
          <View style={styles.row}>
            <TextInput
              label="Pasillo"
              value={aisle}
              onChangeText={setAisle}
              style={[styles.flex1, { backgroundColor: theme.colors.surface }]}
              mode="outlined"
              dense
            />
            <TextInput
              label="Rack"
              value={rack}
              onChangeText={setRack}
              style={[styles.flex1, { backgroundColor: theme.colors.surface, marginHorizontal: 8 }]}
              mode="outlined"
              dense
            />
            <TextInput
              label="Fila"
              value={shelf}
              onChangeText={setShelf}
              style={[styles.flex1, { backgroundColor: theme.colors.surface }]}
              mode="outlined"
              dense
            />
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>Otros</Text>
          <View style={styles.row}>
            <TextInput
              label="Prefijo posición"
              value={positionPrefix}
              onChangeText={setPositionPrefix}
              style={[styles.flex1, { backgroundColor: theme.colors.surface }]}
              mode="outlined"
              dense
            />
            <TextInput
              label="Capacidad"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
              style={[styles.flex1, { backgroundColor: theme.colors.surface, marginLeft: 8 }]}
              mode="outlined"
              dense
              error={!!errors.capacity}
            />
          </View>

          <TextInput
            label="Prefijo barcode (opcional)"
            value={barcodePrefix}
            onChangeText={setBarcodePrefix}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            mode="outlined"
            dense
          />

          <View style={styles.actions}>
            <Button mode="outlined" onPress={handleDismiss} style={styles.button}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={loading}
              style={styles.button}
            >
              Crear {parseInt(count, 10) || 0} ubicaciones
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  parentInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  segmented: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  button: {
    minWidth: 120,
  },
});
