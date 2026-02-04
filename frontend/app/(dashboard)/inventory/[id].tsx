import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator, DataTable } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/src/legacy';
import * as Sharing from 'expo-sharing';

import { LoadingScreen } from '../../../components/LoadingScreen';
import { getProductLedger, getProductById, Product } from '../../../services/productService';
import { Colors } from '../../../constants/Colors';

interface LedgerItem {
  id: number;
  created_at: string;
  type: string;
  quantity: number;
  previous_balance: number;
  new_balance: number;
  warehouse_id: number;
  movement_request_id?: number;
  reference?: string; // From join or extra fetch? Movement model has request_id.
}

export default function ProductLedgerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [productData, ledgerData] = await Promise.all([
        getProductById(Number(id)),
        getProductLedger(Number(id), { limit: 100 }) // Fetch last 100 movements
      ]);
      setProduct(productData);
      setLedger(ledgerData);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error cargando kardex' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportToCSV = async () => {
    if (ledger.length === 0) return;

    const header = "ID,Fecha,Tipo,Cantidad,Saldo Anterior,Saldo Nuevo,Almacen\n";
    const rows = ledger.map(item => 
      `${item.id},"${formatDate(item.created_at)}",${item.type},${item.quantity},${item.previous_balance},${item.new_balance},${item.warehouse_id}`
    ).join("\n");
    const csvContent = header + rows;

    if (Platform.OS === 'web') {
        // Web download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `kardex_${product?.sku || 'export'}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } else {
        // Mobile share
        const fileUri = FileSystem.documentDirectory + `kardex_${product?.sku || 'export'}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'IN': return Colors.success;
      case 'OUT': return Colors.error;
      case 'TRANSFER': return Colors.info;
      case 'ADJUSTMENT': return Colors.warning;
      default: return Colors.primary;
    }
  };

  if (loading && !product) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button icon="arrow-left" mode="text" onPress={() => router.back()}>
            Volver
        </Button>
        <Text variant="headlineSmall" style={styles.title}>
            Kardex: {product?.name}
        </Text>
        <Button mode="outlined" icon="download" onPress={exportToCSV}>
            Exportar CSV
        </Button>
      </View>

      <Card style={styles.infoCard}>
          <Card.Content>
              <View style={styles.infoRow}>
                  <Text variant="bodyMedium"><Text style={{fontWeight: 'bold'}}>SKU:</Text> {product?.sku}</Text>
                  <Text variant="bodyMedium"><Text style={{fontWeight: 'bold'}}>Min Stock:</Text> {product?.min_stock}</Text>
                  <Text variant="bodyMedium"><Text style={{fontWeight: 'bold'}}>Unidad:</Text> {product?.unit_id} (ID)</Text>
              </View>
          </Card.Content>
      </Card>

      <Card style={styles.tableCard}>
        <ScrollView horizontal>
            <View>
                <DataTable>
                    <DataTable.Header>
                        <DataTable.Title style={{width: 60}}>ID</DataTable.Title>
                        <DataTable.Title style={{width: 150}}>Fecha</DataTable.Title>
                        <DataTable.Title style={{width: 100}}>Tipo</DataTable.Title>
                        <DataTable.Title numeric style={{width: 80}}>Cant.</DataTable.Title>
                        <DataTable.Title numeric style={{width: 80}}>Saldo</DataTable.Title>
                        <DataTable.Title numeric style={{width: 80}}>Almacén</DataTable.Title>
                    </DataTable.Header>

                    {ledger.map((item) => (
                        <DataTable.Row key={item.id}>
                            <DataTable.Cell style={{width: 60}}>{item.id}</DataTable.Cell>
                            <DataTable.Cell style={{width: 150}} textStyle={{fontSize: 12}}>{formatDate(item.created_at)}</DataTable.Cell>
                            <DataTable.Cell style={{width: 100}}>
                                <Chip 
                                    textStyle={{ color: 'white', fontSize: 10 }} 
                                    style={{ backgroundColor: getTypeColor(item.type), height: 24 }}
                                >
                                    {item.type}
                                </Chip>
                            </DataTable.Cell>
                            <DataTable.Cell numeric style={{width: 80}}>
                                <Text style={{ color: item.quantity > 0 ? Colors.success : Colors.error, fontWeight: 'bold' }}>
                                    {item.quantity > 0 ? '+' : ''}{item.quantity}
                                </Text>
                            </DataTable.Cell>
                            <DataTable.Cell numeric style={{width: 80}}>{item.new_balance}</DataTable.Cell>
                            <DataTable.Cell numeric style={{width: 80}}>{item.warehouse_id}</DataTable.Cell>
                        </DataTable.Row>
                    ))}

                    {ledger.length === 0 && (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text>No hay movimientos registrados.</Text>
                        </View>
                    )}
                </DataTable>
            </View>
        </ScrollView>
      </Card>
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  title: {
      flex: 1, 
      marginLeft: 8,
      fontWeight: 'bold',
  },
  infoCard: {
      marginBottom: 16,
      backgroundColor: 'white',
  },
  infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 16,
  },
  tableCard: {
      flex: 1,
      overflow: 'hidden', // Ensure rounded corners
  },
});
