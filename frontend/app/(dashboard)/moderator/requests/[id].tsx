import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Text, Button, Card, Divider, TextInput, Chip, Snackbar, Portal, Dialog, Paragraph, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { useAuth } from '../../../../hooks/useAuth';

export default function RequestDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [request, setRequest] = useState<MovementRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');

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
        loadRequest(request.id);
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

  const getTypeColorValue = (type: MovementType) => {
    switch (type) {
      case MovementType.IN: return '#4caf50';
      case MovementType.OUT: return '#f44336';
      case MovementType.TRANSFER: return '#2196f3';
      case MovementType.ADJUSTMENT: return '#ff9800';
      default: return theme.colors.primary;
    }
  };

  const getStatusColorValue = (status: MovementStatus) => {
      switch (status) {
          case MovementStatus.PENDING: return '#ff9800';
          case MovementStatus.APPROVED: return '#4caf50';
          case MovementStatus.REJECTED: return '#f44336';
          case MovementStatus.APPLIED:
          case MovementStatus.COMPLETED: return '#2196f3';
          default: return theme.colors.outline;
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
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>Solicitud #{request.id}</Text>
      </View>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
            <View style={styles.row}>
                <View>
                    <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Estado</Text>
                    <Chip style={{ backgroundColor: getStatusColorValue(request.status) }} textStyle={{ color: 'white' }}>
                        {request.status}
                    </Chip>
                </View>
                <View>
                    <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Tipo</Text>
                    <Chip style={{ backgroundColor: getTypeColorValue(request.type) }} textStyle={{ color: 'white' }}>
                        {request.type}
                    </Chip>
                </View>
                <View>
                    <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Fecha</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                        {new Date(request.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            <Divider style={styles.divider} />

            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Motivo</Text>
            <Text variant="bodyLarge" style={{ marginBottom: 12, color: theme.colors.onSurface }}>
                {request.reason}
            </Text>

            {request.reference && (
                <>
                    <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Referencia</Text>
                    <Text variant="bodyLarge" style={{ marginBottom: 12, color: theme.colors.onSurface }}>
                        {request.reference}
                    </Text>
                </>
            )}

            {request.project_name && (
                <>
                    <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Proyecto</Text>
                    <Text variant="bodyLarge" style={{ marginBottom: 12, color: theme.colors.onSurface }}>
                        {request.project_name}
                    </Text>
                </>
            )}

            {request.source_warehouse_id && (
                <>
                     <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Almacén Origen</Text>
                     <Text variant="bodyLarge" style={{ marginBottom: 12, color: theme.colors.onSurface }}>
                         ID: {request.source_warehouse_id}
                     </Text>
                </>
            )}
            
            {request.destination_warehouse_id && (
                <>
                     <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Almacén Destino</Text>
                     <Text variant="bodyLarge" style={{ marginBottom: 12, color: theme.colors.onSurface }}>
                         ID: {request.destination_warehouse_id}
                     </Text>
                </>
            )}

        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Items</Text>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
              {request.items.map((item) => (
                  <View 
                    key={item.id} 
                    style={[styles.itemRow, { borderBottomColor: theme.colors.outlineVariant }]}
                  >
                      <View style={{ flex: 1 }}>
                          <Text style={[styles.itemName, { color: theme.colors.onSurface }]}>
                              {item.product?.name || `Producto #${item.product_id}`}
                          </Text>
                          {item.product?.sku && (
                              <Text style={[styles.itemNotes, { color: theme.colors.onSurfaceVariant }]}>
                                  SKU: {item.product.sku}
                              </Text>
                          )}
                          {item.notes && (
                              <Text style={[styles.itemNotes, { color: theme.colors.onSurfaceVariant }]}>
                                  {item.notes}
                              </Text>
                          )}
                      </View>
                      <Text style={[styles.itemQty, { color: theme.colors.primary }]}>
                          {item.quantity}
                      </Text>
                  </View>
              ))}
          </Card.Content>
      </Card>

      {isPending && (
          <Card style={[styles.card, styles.actionCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Title title="Revisión" titleStyle={{ color: theme.colors.onSurface }} />
              <Card.Content>
                  <TextInput
                    mode="outlined"
                    label="Notas de Aprobación/Rechazo"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}
                  />
                  <View style={styles.actionButtons}>
                      <Button 
                        mode="contained" 
                        buttonColor="#f44336"
                        onPress={handleReject}
                        loading={processing}
                        disabled={processing}
                        style={styles.button}
                      >
                          Rechazar
                      </Button>
                      <Button 
                        mode="contained" 
                        buttonColor="#4caf50"
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

      {isApproved && (
           <Card style={[styles.card, styles.actionCard, { backgroundColor: theme.colors.surface }]}>
             <Card.Title title="Ejecución" titleStyle={{ color: theme.colors.onSurface }} />
             <Card.Content>
                 <Text style={{ marginBottom: 16, color: theme.colors.onSurface }}>
                     Esta solicitud ha sido aprobada. Puede proceder a aplicar los movimientos de inventario.
                 </Text>
                 {request.approval_notes && (
                     <View style={{ backgroundColor: theme.dark ? '#1b3d1b' : '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                         <Text style={{ color: '#4caf50', fontWeight: 'bold' }}>Nota de Aprobación:</Text>
                         <Text style={{ color: theme.colors.onSurface }}>{request.approval_notes}</Text>
                     </View>
                 )}
                 <Button 
                    mode="contained" 
                    buttonColor={theme.colors.primary}
                    onPress={handleApply}
                    loading={processing}
                    disabled={processing}
                 >
                    Aplicar Movimiento
                 </Button>
             </Card.Content>
           </Card>
      )}

      {isCompleted && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                  <Text style={{ color: '#4caf50', fontWeight: 'bold', textAlign: 'center' }}>
                      Movimiento Completado y Aplicado
                  </Text>
              </Card.Content>
          </Card>
      )}

      <View style={{ height: 40 }} />

      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
            <Dialog.Title style={{ color: theme.colors.onSurface }}>Confirmar Aplicación</Dialog.Title>
            <Dialog.Content>
                <Paragraph style={{ color: theme.colors.onSurface }}>
                    Se aplicará un movimiento de tipo {request.type} con {request.items.length} items.
                    {"\n\n"}
                    Esta acción afectará el inventario real. ¿Continuar?
                </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setConfirmVisible(false)}>Cancelar</Button>
                <Button onPress={executeApply} loading={processing}>Aplicar</Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{
            backgroundColor: snackbarType === 'error' ? '#f44336' : 
                             snackbarType === 'success' ? '#4caf50' : theme.colors.inverseSurface
        }}
        action={{
            label: 'Cerrar',
            textColor: snackbarType === 'error' || snackbarType === 'success' ? 'white' : theme.colors.inverseOnSurface,
            onPress: () => setSnackbarVisible(false),
        }}
      >
        <Text style={{ color: snackbarType === 'error' || snackbarType === 'success' ? 'white' : theme.colors.inverseOnSurface }}>
            {snackbarMessage}
        </Text>
      </Snackbar>

    </ScrollableContent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  card: {
    marginBottom: 16,
  },
  actionCard: {
      borderWidth: 1,
  },
  sectionTitle: {
      marginBottom: 8,
      marginLeft: 4,
      fontWeight: 'bold',
  },
  row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
  },
  label: {
      fontSize: 12,
      marginBottom: 4,
  },
  divider: {
      marginVertical: 16,
  },
  itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
  },
  itemName: {
      fontWeight: '600',
      fontSize: 16,
  },
  itemNotes: {
      fontSize: 12,
      marginTop: 2,
  },
  itemQty: {
      fontWeight: 'bold',
      fontSize: 18,
  },
  actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  button: {
      flex: 0.48,
  }
});
