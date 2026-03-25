import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Topbar } from '../../../../components/Topbar';
import { inventoryService, InventorySummaryResponse } from '../../../../services/inventoryService';
import { Colors } from '../../../../constants/Colors';

export default function InventorySummaryScreen() {
    const [summary, setSummary] = useState<InventorySummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getInventorySummary();
            setSummary(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator size="large" color="#007bff" style={styles.loader} />;

    if (!summary) {
        return (
            <View style={styles.container}>
                <Topbar title="Resumen de Inventario" />
                <Text style={styles.empty}>No hay datos disponibles</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Topbar title="Resumen de Inventario" />
            <ScrollView style={styles.content}>

                {/* Overview Cards */}
                <View style={styles.overviewGrid}>
                    <View style={[styles.overviewCard, { borderLeftColor: Colors.info }]}>
                        <Text style={styles.overviewValue}>{summary.total_products}</Text>
                        <Text style={styles.overviewLabel}>Productos</Text>
                    </View>
                    <View style={[styles.overviewCard, { borderLeftColor: Colors.success }]}>
                        <Text style={styles.overviewValue}>{summary.total_stock.toLocaleString()}</Text>
                        <Text style={styles.overviewLabel}>Stock Total</Text>
                    </View>
                </View>

                {/* Alerts Summary */}
                <View style={styles.alertsContainer}>
                    <View style={[styles.alertCard, styles.alertDanger]}>
                        <Text style={styles.alertValue}>{summary.out_of_stock_count}</Text>
                        <Text style={styles.alertLabel}>Sin Stock</Text>
                    </View>
                    <View style={[styles.alertCard, styles.alertWarning]}>
                        <Text style={styles.alertValue}>{summary.low_stock_count}</Text>
                        <Text style={styles.alertLabel}>Stock Bajo</Text>
                    </View>
                    <View style={[styles.alertCard, styles.alertInfo]}>
                        <Text style={styles.alertValue}>{summary.expiring_soon_count}</Text>
                        <Text style={styles.alertLabel}>Por Vencer</Text>
                    </View>
                </View>

                {/* By Warehouse */}
                <Text style={styles.sectionTitle}>Por Almacén</Text>
                <View style={styles.card}>
                    {summary.by_warehouse.length > 0 ? (
                        summary.by_warehouse.map((wh) => (
                            <View key={wh.warehouse_id} style={styles.warehouseItem}>
                                <View style={styles.warehouseHeader}>
                                    <Text style={styles.warehouseName}>{wh.warehouse_name}</Text>
                                    <Text style={styles.warehouseCode}>{wh.warehouse_code}</Text>
                                </View>
                                <View style={styles.warehouseStats}>
                                    <View style={styles.warehouseStat}>
                                        <Text style={styles.warehouseStatValue}>{wh.total_products}</Text>
                                        <Text style={styles.warehouseStatLabel}>Productos</Text>
                                    </View>
                                    <View style={styles.warehouseStat}>
                                        <Text style={styles.warehouseStatValue}>{wh.total_stock.toLocaleString()}</Text>
                                        <Text style={styles.warehouseStatLabel}>Stock</Text>
                                    </View>
                                    <View style={styles.warehouseStat}>
                                        <Text style={[styles.warehouseStatValue, wh.low_stock_count > 0 && styles.textDanger]}>
                                            {wh.low_stock_count}
                                        </Text>
                                        <Text style={styles.warehouseStatLabel}>Stock Bajo</Text>
                                    </View>
                                    <View style={styles.warehouseStat}>
                                        <Text style={[styles.warehouseStatValue, wh.expiring_soon_count > 0 && styles.textWarning]}>
                                            {wh.expiring_soon_count}
                                        </Text>
                                        <Text style={styles.warehouseStatLabel}>Por Vencer</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No hay datos por almacén</Text>
                    )}
                </View>

                {/* By Category */}
                <Text style={styles.sectionTitle}>Por Categoría</Text>
                <View style={styles.card}>
                    {summary.by_category.length > 0 ? (
                        summary.by_category.map((cat, index) => (
                            <View key={index} style={styles.categoryItem}>
                                <View style={styles.categoryHeader}>
                                    <Text style={styles.categoryName}>{cat.category_name}</Text>
                                    <Text style={styles.categoryStock}>{cat.total_stock.toLocaleString()}</Text>
                                </View>
                                <View style={styles.categoryBar}>
                                    <View 
                                        style={[
                                            styles.categoryFill, 
                                            { width: `${Math.min((cat.total_stock / Math.max(summary.total_stock, 1)) * 100, 100)}%` }
                                        ]} 
                                    />
                                </View>
                                <Text style={styles.categoryProducts}>{cat.total_products} producto(s)</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No hay datos por categoría</Text>
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    loader: { marginTop: 50 },
    content: { padding: 15 },
    overviewGrid: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    overviewCard: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 8, elevation: 2, alignItems: 'center', borderLeftWidth: 4 },
    overviewValue: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    overviewLabel: { fontSize: 12, color: '#666', marginTop: 4 },
    alertsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    alertCard: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', elevation: 2 },
    alertDanger: { backgroundColor: Colors.danger + '20' },
    alertWarning: { backgroundColor: Colors.warning + '20' },
    alertInfo: { backgroundColor: Colors.info + '20' },
    alertValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    alertLabel: { fontSize: 11, color: '#666', marginTop: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 10, color: '#333' },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
    warehouseItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    warehouseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    warehouseName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    warehouseCode: { fontSize: 12, color: '#666', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    warehouseStats: { flexDirection: 'row', justifyContent: 'space-between' },
    warehouseStat: { alignItems: 'center' },
    warehouseStatValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    warehouseStatLabel: { fontSize: 10, color: '#666' },
    textDanger: { color: Colors.danger },
    textWarning: { color: Colors.warning },
    categoryItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    categoryName: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
    categoryStock: { fontSize: 14, fontWeight: 'bold', color: Colors.info },
    categoryBar: { height: 6, backgroundColor: '#eee', borderRadius: 3, marginBottom: 4 },
    categoryFill: { height: '100%', backgroundColor: Colors.info, borderRadius: 3 },
    categoryProducts: { fontSize: 12, color: '#666' },
    empty: { textAlign: 'center', color: '#666', marginTop: 50 },
    emptyText: { textAlign: 'center', color: '#666', paddingVertical: 20 },
});
