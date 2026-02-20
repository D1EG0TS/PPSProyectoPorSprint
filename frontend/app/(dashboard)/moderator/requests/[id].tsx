import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Text, Button, Card, Divider, TextInput, Chip, HelperText, Portal, Dialog, Paragraph, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { LoadingScreen } from '../../../../components/LoadingScreen';
import { 
    getMovementRequestById, 
    approveMovementRequest, 
    rejectMovementRequest, 
    applyMovementRequest,
    MovementRequest, 
    MovementType, 
    MovementStatus 
} from '../../../../services/movementService';
import { Colors } from '../../../../constants/Colors';
import { useAuth } from '../../../../hooks/useAuth';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [request, setRequest] = useState<MovementRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');

  // UI Feedback State
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (id) {
        loadRequest(Number(id));
    }
  }, [id]);

  const showSnackbar = (message: string, type: 'success' | 'error' | 'info') => {
      setSnackbarMessage(message);
      setSnackbarType(type);
      setSnackbarVisible(true);
  };

  const loadRequest = async (requestId: number) => {
    setLoading(true);
    try {
      const data = await getMovementRequestById(requestId);
      setRequest(data);
    } catch (error) {
      console.error(error);
      showSnackbar('Error cargando solicitud', 'error');
      // Toast.show({ type: 'error', text1: 'Error cargando solicitud' });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!request) return;
    setProcessing(true);
    try {
        await approveMovementRequest(request.id, notes);
        showSnackbar('Solicitud aprobada', 'success');
        loadRequest(request.id); // Reload to show new status
    } catch (error: any) {
        console.error(error);
        const msg = error.response?.data?.detail || "Error al aprobar";
        showSnackbar(msg, 'error');
    } finally {
        setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    if (!notes) {
        showSnackbar('Debe agregar una nota para rechazar', 'error');
        return;
    }
    setProcessing(true);
    try {
        await rejectMovementRequest(request.id, notes);
        showSnackbar('Solicitud rechazada', 'success');
        loadRequest(request.id);
    } catch (error: any) {
        console.error(error);
        const msg = error.response?.data?.detail || "Error al rechazar";
        showSnackbar(msg, 'error');
    } finally {
        setProcessing(false);
    }
  };

  const handleApply = () => {
    if (!request) return;
    setConfirmVisible(true);
  };

  const executeApply = async () => {
    if (!request) return;
    setConfirmVisible(false);
    setProcessing(true);
    try {
        await applyMovementRequest(request.id);
        showSnackbar(`Movimiento aplicado correctamente. ${request.items.length} items procesados.`, 'success');
        loadRequest(request.id);
    } catch (error: any) {
        console.error("Apply Error:", error);
        const msg = error.response?.data?.detail || error.message || "Error al aplicar";
        showSnackbar(`Error: ${msg}`, 'error');
    } finally {
        setProcessing(false);
    }
  };

  const getTypeColor = (type: MovementType) => {
    switch (type) {
      case MovementType.IN: return Colors.success;
      case MovementType.OUT: return Colors.error;
      case MovementType.TRANSFER: return Colors.info;
      case MovementType.ADJUSTMENT: return Colors.warning;
      default: return Colors.primary;
    }
  };

  const getStatusColor = (status: MovementStatus) => {
      switch (status) {
          case MovementStatus.PENDING: return Colors.warning;
          case MovementStatus.APPROVED: return Colors.success;
          case MovementStatus.REJECTED: return Colors.error;
          case MovementStatus.APPLIED:
          case MovementStatus.COMPLETED: return Colors.info;
          default: return Colors.text;
      }
  };

  if (loading || !request) {
    return <LoadingScreen />;
  }

  const isPending = request.status === MovementStatus.PENDING;
  const isApproved = request.status === MovementStatus.APPROVED;
  const isCompleted = request.status === MovementStatus.COMPLETED || request.status === MovementStatus.APPLIED;

  return (
    <ScrollableContent containerStyle={styles.container}>
      <View style={styles.header}>
        <Button icon="arrow-left" mode="text" onPress={() => router.back()}>Volver</Button>
        <Text variant="headlineSmall">Solicitud #{request.id}</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
            <View style={styles.row}>
                <View>
                    <Text style={styles.label}>Estado</Text>
                    <Chip style={{ backgroundColor: getStatusColor(request.status) }} textStyle={{ color: 'white' }}>
                        {request.status}
                    </Chip>
                </View>
                <View>
                    <Text style={styles.label}>Tipo</Text>
                    <Chip style={{ backgroundColor: getTypeColor(request.type) }} textStyle={{ color: 'white' }}>
                        {request.type}
                    </Chip>
                </View>
                <View>
                    <Text style={styles.label}>Fecha</Text>
                    <Text variant="bodyMedium">{new Date(request.created_at).toLocaleDateString()}</Text>
                </View>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.label}>Motivo</Text>
            <Text variant="bodyLarge" style={{ marginBottom: 12 }}>{request.reason}</Text>

            {request.reference && (
                <>
                    <Text style={styles.label}>Referencia</Text>
                    <Text variant="bodyLarge" style={{ marginBottom: 12 }}>{request.reference}</Text>
                </>
            )}

            {request.source_warehouse_id && (
                <>
                     <Text style={styles.label}>Origen</Text>
                     <Text variant="bodyLarge" style={{ marginBottom: 12 }}>ID: {request.source_warehouse_id}</Text>
                </>
            )}
            
            {request.destination_warehouse_id && (
                <>
                     <Text style={styles.label}>Destino</Text>
                     <Text variant="bodyLarge" style={{ marginBottom: 12 }}>ID: {request.destination_warehouse_id}</Text>
                </>
            )}

        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>Items</Text>
      <Card style={styles.card}>
          <Card.Content>
              {request.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>Producto #{item.product_id}</Text>
                          {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
                      </View>
                      <Text style={styles.itemQty}>{item.quantity}</Text>
                  </View>
              ))}
          </Card.Content>
      </Card>

      {/* Approval/Rejection Section */}
      {isPending && (
          <Card style={[styles.card, styles.actionCard]}>
              <Card.Title title="Revisión" />
              <Card.Content>
                  <TextInput
                    mode="outlined"
                    label="Notas de Aprobación/Rechazo"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    style={{ marginBottom: 16 }}
                  />
                  <View style={styles.actionButtons}>
                      <Button 
                        mode="contained" 
                        buttonColor={Colors.error} 
                        onPress={handleReject}
                        loading={processing}
                        disabled={processing}
                        style={styles.button}
                      >
                          Rechazar
                      </Button>
                      <Button 
                        mode="contained" 
                        buttonColor={Colors.success} 
                        onPress={handleApprove}
                        loading={processing}
                        disabled={processing}
                        style={styles.button}
                      >
                          Aprobar
                      </Button>
                  </View>
              </Card.Content>
          </Card>
      )}

      {/* Apply Section - Only if Approved */}
      {isApproved && (
           <Card style={[styles.card, styles.actionCard]}>
             <Card.Title title="Ejecución" />
             <Card.Content>
                 <Text style={{ marginBottom: 16 }}>
                     Esta solicitud ha sido aprobada. Puede proceder a aplicar los movimientos de inventario.
                 </Text>
                 {request.approval_notes && (
                     <View style={{ backgroundColor: '#f0fdf4', padding: 8, borderRadius: 4, marginBottom: 16 }}>
                         <Text style={{ color: Colors.success, fontWeight: 'bold' }}>Nota de Aprobación:</Text>
                         <Text>{request.approval_notes}</Text>
                     </View>
                 )}
                 <Button 
                    mode="contained" 
                    buttonColor={Colors.primary} 
                    onPress={handleApply}
                    loading={processing}
                    disabled={processing}
                 >
                     Aplicar Movimiento
                 </Button>
             </Card.Content>
           </Card>
      )}

      {/* Completed Info */}
      {isCompleted && (
          <Card style={styles.card}>
              <Card.Content>
                  <Text style={{ color: Colors.success, fontWeight: 'bold', textAlign: 'center' }}>
                      Movimiento Completado y Aplicado
                  </Text>
              </Card.Content>
          </Card>
      )}

      <View style={{ height: 40 }} />

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
            <Dialog.Title>Confirmar Aplicación</Dialog.Title>
            <Dialog.Content>
                <Paragraph>
                    Se aplicará un movimiento de tipo {request.type} con {request.items.length} items.
                    {"\n"}
                    Esta acción afectará el inventario real. ¿Continuar?
                </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setConfirmVisible(false)}>Cancelar</Button>
                <Button onPress={executeApply} loading={processing}>Aplicar</Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Feedback Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{
            backgroundColor: snackbarType === 'error' ? Colors.error : 
                             snackbarType === 'success' ? Colors.success : '#323232'
        }}
        action={{
            label: 'Cerrar',
            onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>

    </ScrollableContent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  actionCard: {
      borderColor: Colors.border,
      borderWidth: 1,
  },
  sectionTitle: {
      marginBottom: 8,
      marginLeft: 4,
      fontWeight: 'bold',
      color: '#4b5563',
  },
  row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
  },
  label: {
      fontSize: 12,
      color: '#6b7280',
      marginBottom: 4,
  },
  divider: {
      marginVertical: 16,
  },
  itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
  },
  itemName: {
      fontWeight: '600',
      fontSize: 16,
  },
  itemNotes: {
      fontSize: 12,
      color: '#6b7280',
  },
  itemQty: {
      fontWeight: 'bold',
      fontSize: 16,
      color: Colors.primary,
  },
  actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  button: {
      flex: 0.48,
  }
});
