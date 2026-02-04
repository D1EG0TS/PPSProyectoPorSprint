import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Checkbox, useTheme, TextInput, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getEPPs, inspectEPP, EPP, EPPStatus } from '../../../../services/eppService';
import { Table } from '../../../../components/Table';
import { Modal } from '../../../../components/Modal';
import Toast from 'react-native-toast-message';
import { Input } from '../../../../components/Input';

const inspectionSchema = z.object({
  passed: z.boolean(),
  notes: z.string().optional(),
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

export default function ModeratorInspectionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [epps, setEpps] = useState<EPP[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEpp, setSelectedEpp] = useState<EPP | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      passed: true,
      notes: '',
    },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch all assigned EPPs for inspection
      const data = await getEPPs({ status: EPPStatus.ASSIGNED });
      setEpps(data);
    } catch (error) {
      console.error('Error loading EPPs:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar las inspecciones pendientes',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInspect = (epp: EPP) => {
    setSelectedEpp(epp);
    reset({ passed: true, notes: '' });
    setModalVisible(true);
  };

  const onSubmit = async (data: InspectionFormData) => {
    if (!selectedEpp) return;

    try {
      await inspectEPP(selectedEpp.id, data);
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Inspección registrada correctamente',
      });
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error recording inspection:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo registrar la inspección',
      });
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { 
      key: 'product', 
      label: 'Producto',
      renderCell: (item: EPP) => <Text>{item.product?.name || `ID: ${item.product_id}`}</Text>
    },
    { key: 'serial_number', label: 'Serie' },
    { key: 'expiration_date', label: 'Vence', renderCell: (item: EPP) => <Text>{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : '-'}</Text> },
    {
      key: 'actions',
      label: 'Acciones',
      renderCell: (item: EPP) => (
        <Button mode="contained" compact onPress={() => handleInspect(item)}>
          Inspeccionar
        </Button>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Inspecciones Pendientes</Text>
        <Button mode="outlined" onPress={loadData} icon="refresh">
          Actualizar
        </Button>
      </View>

      <Table
        data={epps}
        columns={columns}
        keyExtractor={(item: EPP) => item.id.toString()}
        loading={loading} // Note: Table component might not have loading prop, check implementation
        emptyMessage="No hay EPPs asignados pendientes de inspección."
      />

      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        title={`Inspeccionar EPP #${selectedEpp?.id}`}
      >
        <View style={styles.form}>
          <View style={styles.checkboxContainer}>
            <Controller
              control={control}
              name="passed"
              render={({ field: { onChange, value } }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Checkbox
                    status={value ? 'checked' : 'unchecked'}
                    onPress={() => onChange(!value)}
                  />
                  <Text onPress={() => onChange(!value)}>Inspección Aprobada</Text>
                </View>
              )}
            />
          </View>

          <Input<InspectionFormData>
            label="Notas / Observaciones"
            name="notes"
            control={control}
            error={errors.notes?.message}
            multiline
            numberOfLines={3}
            placeholder="Describa el estado del EPP..."
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
          >
            Registrar Inspección
          </Button>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  form: {
    gap: 12,
  },
  checkboxContainer: {
    marginVertical: 8,
  },
  submitButton: {
    marginTop: 16,
  },
});
