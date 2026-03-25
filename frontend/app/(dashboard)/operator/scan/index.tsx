import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, IconButton, Chip, Surface, Divider, Button, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { BarcodeScanner } from '../../../../components/inventory/BarcodeScanner';
import { inventoryService, ScanResult } from '../../../../services/inventoryService';
import { Colors } from '../../../../constants/Colors';
import { Warehouse } from '../../../../services/inventoryService';

export default function ScanScreen() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await inventoryService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const handleScan = useCallback(async (code: string) => {
    setScanning(true);
    try {
      const result = await inventoryService.scan(code, selectedWarehouse || undefined);
      setScanResult(result);
      if (!result.found) {
        Alert.alert('No encontrado', `No se encontró ningún producto o ubicación con el código: ${code}`);
      }
    } catch (error: any) {
      console.error('Error scanning:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Error al escanear');
    } finally {
      setScanning(false);
    }
  }, [selectedWarehouse]);

  const handleClear = () => {
    setScanResult(null);
  };

  const getStockStatus = () => {
    if (!scanResult) return null;
    if (scanResult.current_stock <= 0) return { label: 'Sin stock', color: Colors.danger };
    if (scanResult.current_stock <= scanResult.min_stock) return { label: 'Stock bajo', color: Colors.warning };
    return { label: 'Disponible', color: Colors.success };
  };

  const stockStatus = getStockStatus();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>Escanear</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Escanea un producto o ubicación
        </Text>
      </View>

      <View style={styles.warehouseSelector}>
        <Text variant="labelMedium" style={styles.label}>Almacén:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {warehouses.map((wh) => (
            <Chip
              key={wh.id}
              selected={selectedWarehouse === wh.id}
              onPress={() => setSelectedWarehouse(wh.id)}
              style={styles.warehouseChip}
              mode="outlined"
            >
              {wh.name}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <View style={styles.scannerContainer}>
        <BarcodeScanner
          onScan={handleScan}
          onClear={handleClear}
          disabled={scanning}
        />
        {scanning && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Buscando...</Text>
          </View>
        )}
      </View>

      {scanResult?.found && scanResult.product_id && (
        <Surface style={styles.resultCard} elevation={2}>
          <View style={styles.resultHeader}>
            <IconButton icon="package-variant" size={32} iconColor={Colors.primary} />
            <View style={styles.resultTitleContainer}>
              <Text variant="titleMedium" style={styles.resultTitle}>
                {scanResult.name}
              </Text>
              {scanResult.brand && (
                <Text variant="bodySmall" style={styles.resultBrand}>{scanResult.brand}</Text>
              )}
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text variant="labelSmall" style={styles.infoLabel}>SKU</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{scanResult.sku}</Text>
            </View>
            {scanResult.barcode && (
              <View style={styles.infoItem}>
                <Text variant="labelSmall" style={styles.infoLabel}>Barcode</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>{scanResult.barcode}</Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text variant="labelSmall" style={styles.infoLabel}>Categoría</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{scanResult.category || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text variant="labelSmall" style={styles.infoLabel}>Unidad</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>{scanResult.unit || 'N/A'}</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.stockSection}>
            <View style={styles.stockInfo}>
              <Text variant="labelMedium" style={styles.stockLabel}>Stock actual</Text>
              <Text variant="headlineMedium" style={styles.stockValue}>{scanResult.current_stock}</Text>
              {stockStatus && (
                <Chip 
                  style={[styles.stockBadge, { backgroundColor: stockStatus.color }]}
                  textStyle={styles.stockBadgeText}
                >
                  {stockStatus.label}
                </Chip>
              )}
            </View>
            {scanResult.min_stock > 0 && (
              <View style={styles.minStockInfo}>
                <Text variant="bodySmall" style={styles.minStockText}>
                  Mínimo: {scanResult.min_stock}
                </Text>
              </View>
            )}
          </View>

          {scanResult.locations && scanResult.locations.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <Text variant="titleSmall" style={styles.locationsTitle}>Ubicaciones</Text>
              {scanResult.locations.map((loc, index) => (
                <View key={index} style={styles.locationItem}>
                  <View style={styles.locationInfo}>
                    <IconButton icon="map-marker" size={20} iconColor={Colors.secondary} />
                    <View>
                      <Text variant="bodyMedium">{loc.location_code}</Text>
                      <Text variant="bodySmall" style={styles.locationWarehouse}>{loc.warehouse_name}</Text>
                    </View>
                  </View>
                  <Text variant="titleMedium" style={styles.locationQty}>{loc.quantity}</Text>
                </View>
              ))}
            </>
          )}

          <Divider style={styles.divider} />

          <View style={styles.actions}>
            <Button 
              mode="contained" 
              icon="plus"
              onPress={() => router.push({ pathname: '/operator/receive', params: { productId: scanResult.product_id?.toString() } })}
              style={styles.actionButton}
            >
              Recibir
            </Button>
            <Button 
              mode="outlined" 
              icon="information"
              onPress={() => router.push({ pathname: `/admin/products/${scanResult.product_id}/edit` })}
              style={styles.actionButton}
            >
              Detalle
            </Button>
          </View>
        </Surface>
      )}

      {scanResult?.found && !scanResult.product_id && (
        <Surface style={styles.resultCard} elevation={2}>
          <View style={styles.resultHeader}>
            <IconButton icon="map-marker" size={32} iconColor={Colors.primary} />
            <View style={styles.resultTitleContainer}>
              <Text variant="titleMedium" style={styles.resultTitle}>
                {scanResult.name}
              </Text>
              <Text variant="bodySmall" style={styles.resultBrand}>
                Stock total: {scanResult.current_stock}
              </Text>
            </View>
          </View>

          {scanResult.locations && scanResult.locations.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <Text variant="titleSmall" style={styles.locationsTitle}>Productos en esta ubicación</Text>
              {scanResult.locations.map((loc, index) => (
                <View key={index} style={styles.locationItem}>
                  <View style={styles.locationInfo}>
                    <IconButton icon="package-variant" size={20} iconColor={Colors.secondary} />
                    <View>
                      <Text variant="bodyMedium">#{index + 1}</Text>
                      <Text variant="bodySmall" style={styles.locationWarehouse}>
                        Almacén: {loc.warehouse_name}
                      </Text>
                    </View>
                  </View>
                  <Text variant="titleMedium" style={styles.locationQty}>{loc.quantity}</Text>
                </View>
              ))}
            </>
          )}
        </Surface>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.white,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
  warehouseSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  warehouseChip: {
    marginRight: 8,
  },
  scannerContainer: {
    padding: 16,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 8,
    color: Colors.textSecondary,
  },
  resultCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  resultTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  resultTitle: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  resultBrand: {
    color: Colors.info,
    textTransform: 'uppercase',
  },
  divider: {
    marginHorizontal: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  infoItem: {
    minWidth: '40%',
  },
  infoLabel: {
    color: Colors.textSecondary,
  },
  infoValue: {
    color: Colors.text,
  },
  stockSection: {
    padding: 16,
    alignItems: 'center',
  },
  stockInfo: {
    alignItems: 'center',
  },
  stockLabel: {
    color: Colors.textSecondary,
  },
  stockValue: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  stockBadge: {
    marginTop: 8,
  },
  stockBadgeText: {
    color: Colors.white,
    fontSize: 12,
  },
  minStockInfo: {
    marginTop: 8,
  },
  minStockText: {
    color: Colors.textSecondary,
  },
  locationsTitle: {
    paddingHorizontal: 16,
    paddingTop: 8,
    fontWeight: '600',
    color: Colors.text,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationWarehouse: {
    color: Colors.textSecondary,
  },
  locationQty: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  spacer: {
    height: 32,
  },
});
