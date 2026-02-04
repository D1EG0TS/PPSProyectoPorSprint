import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, useTheme, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getEPPs, replaceEPP, EPP, EPPStatus } from '../../../../services/eppService';
import { AuthContext } from '../../../../context/AuthContext';
import { Table } from '../../../../components/Table';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import Toast from 'react-native-toast-message';

export default function OperatorMyEPPScreen() {
  const router = useRouter();
  const theme = useTheme();
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const [loading, setLoading] = useState(false);
  const [epps, setEpps] = useState<EPP[]>([]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getEPPs({ assigned_to: user.id });
      setEpps(data);
    } catch (error) {
      console.error('Error loading my EPPs:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar sus EPPs asignados',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleReplace = async (epp: EPP) => {
    Alert.alert(
      "Solicitar Reemplazo",
      "¿Está seguro que desea solicitar el reemplazo de este EPP? El actual será marcado como retirado.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar", 
          onPress: async () => {
            try {
              await replaceEPP(epp.id);
              Toast.show({
                type: 'success',
                text1: 'Éxito',
                text2: 'Reemplazo solicitado correctamente',
              });
              loadData();
            } catch (error) {
              console.error('Error replacing EPP:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'No se pudo procesar el reemplazo',
              });
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: EPPStatus) => {
    switch (status) {
      case EPPStatus.ASSIGNED: return theme.colors.primary;
      case EPPStatus.EXPIRED: return theme.colors.error;
      case EPPStatus.DAMAGED: return theme.colors.error;
      case EPPStatus.REPLACED: return 'gray';
      default: return 'gray';
    }
  };

  const columns = [
    { 
      key: 'product', 
      label: 'Producto',
      renderCell: (item: EPP) => <Text>{item.product?.name || `ID: ${item.product_id}`}</Text>
    },
    { key: 'serial_number', label: 'Serie' },
    { 
      key: 'expiration_date', 
      label: 'Vence', 
      renderCell: (item: EPP) => <Text>{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : '-'}</Text> 
    },
    {
      key: 'status',
      label: 'Estado',
      renderCell: (item: EPP) => (
        <Chip style={{ backgroundColor: getStatusColor(item.status) }} textStyle={{ color: 'white' }}>
          {item.status}
        </Chip>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      renderCell: (item: EPP) => {
        const canReplace = item.status === EPPStatus.ASSIGNED || item.status === EPPStatus.EXPIRED || item.status === EPPStatus.DAMAGED;
        if (!canReplace) return null;
        
        return (
          <Button 
            mode="outlined" 
            compact 
            onPress={() => handleReplace(item)}
            textColor={theme.colors.error}
            style={{ borderColor: theme.colors.error }}
          >
            Reemplazar
          </Button>
        );
      },
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <View style={styles.header}>
          <Text variant="headlineMedium">Mis EPPs Asignados</Text>
          <Button mode="outlined" onPress={loadData} icon="refresh">
            Actualizar
          </Button>
        </View>

        <Table
          data={epps}
          columns={columns}
          keyExtractor={(item: EPP) => item.id.toString()}
          loading={loading}
          emptyMessage="No tiene EPPs asignados actualmente."
        />
      </ScrollableContent>
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
});
