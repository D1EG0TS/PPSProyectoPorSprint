import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, TextInput, Button, Switch, useTheme, HelperText, SegmentedButtons } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { warehouseService, Location, LocationUpdate } from '../../services/warehouseService';

interface LocationEditDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
  warehouseId: number;
  location?: Location | null;
  isNew?: boolean;
  parentId?: number | null;
}

const LOCATION_TYPES = [
  { value: 'zone', label: 'Zona' },
  { value: 'aisle', label: 'Pasillo' },
  { value: 'rack', label: 'Estantería' },
  { value: 'shelf', label: 'Fila' },
  { value: 'bin', label: 'Contenedor' },
];

export const LocationEditDialog: React.FC<LocationEditDialogProps> = ({
  visible,
  onDismiss,
  onSaved,
  warehouseId,
  location,
  isNew = false,
  parentId,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [locationType, setLocationType] = useState('bin');
  const [aisle, setAisle] = useState('');
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [position, setPosition] = useState('');
  const [capacity, setCapacity] = useState('0');
  const [barcode, setBarcode] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      if (location) {
        setCode(location.code || '');
        setName(location.name || '');
        setLocationType(location.location_type || 'bin');
        setAisle(location.aisle || '');
        setRack(location.rack || '');
        setShelf(location.shelf || '');
        setPosition(location.position || '');
        setCapacity(String(location.capacity || 0));
        setBarcode(location.barcode || '');
        setIsRestricted(location.is_restricted || false);
      } else {
        setCode('');
        setName('');
        setLocationType('bin');
        setAisle('');
        setRack('');
        setShelf('');
        setPosition('');
        setCapacity('0');
        setBarcode('');
        setIsRestricted(false);
      }
      setErrors({});
    }
  }, [visible, location]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!code.trim()) {
      newErrors.code = 'El código es requerido';
    }
    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (capacity && isNaN(Number(capacity))) {
      newErrors.capacity = 'Debe ser un número';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const data: LocationUpdate = {
        code: code.trim(),
        name: name.trim(),
        location_type: locationType,
        aisle: aisle.trim() || undefined,
        rack: rack.trim() || undefined,
        shelf: shelf.trim() || undefined,
        position: position.trim() || undefined,
        capacity: parseInt(capacity, 10) || 0,
        barcode: barcode.trim() || undefined,
        is_restricted: isRestricted,
        parent_location_id: isNew ? (parentId || null) : undefined,
      };

      if (isNew) {
        await warehouseService.createLocation(warehouseId, {
          ...data,
          parent_location_id: parentId || undefined,
        } as any);
        Toast.show({ type: 'success', text1: 'Ubicación creada' });
      } else {
        await warehouseService.updateLocation(warehouseId, location!.id, data);
        Toast.show({ type: 'success', text1: 'Ubicación actualizada' });
      }

      onSaved();
      handleDismiss();
    } catch (error: any) {
      console.error('Error saving location:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.detail || 'No se pudo guardar',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setCode('');
    setName('');
    setLocationType('bin');
    setAisle('');
    setRack('');
    setShelf('');
    setPosition('');
    setCapacity('0');
    setBarcode('');
    setIsRestricted(false);
    setErrors({});
    onDismiss();
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
            {isNew ? 'Nueva Ubicación' : 'Editar Ubicación'}
          </Text>

          <TextInput
            label="Código *"
            value={code}
            onChangeText={setCode}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            mode="outlined"
            error={!!errors.code}
            disabled={!isNew}
          />
          <HelperText type="error">{errors.code}</HelperText>

          <TextInput
            label="Nombre *"
            value={name}
            onChangeText={setName}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            mode="outlined"
            error={!!errors.name}
          />
          <HelperText type="error">{errors.name}</HelperText>

          <Text variant="titleMedium" style={styles.sectionTitle}>Tipo</Text>
          <SegmentedButtons
            value={locationType}
            onValueChange={setLocationType}
            buttons={LOCATION_TYPES}
            style={styles.segmented}
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>Coordenadas</Text>
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
          </View>
          <View style={styles.row}>
            <TextInput
              label="Fila"
              value={shelf}
              onChangeText={setShelf}
              style={[styles.flex1, { backgroundColor: theme.colors.surface }]}
              mode="outlined"
              dense
            />
            <TextInput
              label="Posición"
              value={position}
              onChangeText={setPosition}
              style={[styles.flex1, { backgroundColor: theme.colors.surface, marginLeft: 8 }]}
              mode="outlined"
              dense
            />
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>Capacidad y Restricciones</Text>
          <View style={styles.row}>
            <TextInput
              label="Capacidad (unidades)"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
              style={[styles.flex1, { backgroundColor: theme.colors.surface }]}
              mode="outlined"
              dense
              error={!!errors.capacity}
            />
            <TextInput
              label="Barcode"
              value={barcode}
              onChangeText={setBarcode}
              style={[styles.flex1, { backgroundColor: theme.colors.surface, marginLeft: 8 }]}
              mode="outlined"
              dense
            />
          </View>

          <View style={styles.switchRow}>
            <Text variant="bodyLarge">Ubicación restringida</Text>
            <Switch value={isRestricted} onValueChange={setIsRestricted} />
          </View>
          <HelperText type="info">
            Las ubicaciones restringidas requieren permisos especiales
          </HelperText>

          <View style={styles.actions}>
            <Button mode="outlined" onPress={handleDismiss} style={styles.button}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              style={styles.button}
            >
              {isNew ? 'Crear' : 'Guardar'}
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
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    marginBottom: 4,
  },
  segmented: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  button: {
    minWidth: 100,
  },
});
