import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Topbar } from '../../../../components/Topbar';
import { reportsService } from '../../../../services/reportsService';
import { inventoryService } from '../../../../services/inventoryService';
import { useRouter } from 'expo-router';
import { Colors } from '../../../../constants/Colors';

export default function ReportsScreen() {
    const router = useRouter();
    const [itemsOnLoan, setItemsOnLoan] = useState<any>(null);
    const [utilization, setUtilization] = useState<any>(null);
    const [inventorySummary, setInventorySummary] = useState<any>(null);
    const [lowStock, setLowStock] = useState<any>(null);
    const [expiring, setExpiring] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const loanData = await reportsService.getItemsOnLoan();
            const utilData = await reportsService.getUtilizationStats();
            setItemsOnLoan(loanData);
            setUtilization(utilData);

            const summaryData = await inventoryService.getInventorySummary();
            setInventorySummary(summaryData);

            const lowStockData = await inventoryService.getLowStockProducts();
            setLowStock(lowStockData);

            const expiringData = await inventoryService.getExpiringProducts({ days_ahead: 30 });
            setExpiring(expiringData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator size="large" color="#007bff" style={styles.loader} />;

    return (
        <View style={styles.container}>
            <Topbar title="Reportes y Métricas" onBack={() => router.back()} />
            <ScrollView style={styles.content}>

                {/* Inventory Reports Section */}
                <Text style={styles.sectionTitle}>Reporte de Inventario</Text>

                {/* Inventory Summary Cards */}
                <View style={styles.statsGrid}>
                    <TouchableOpacity style={[styles.statCard, styles.statCardWarning]} onPress={() => router.push('/(dashboard)/admin/reports/low-stock')}>
                        <Text style={styles.statCardValue}>{inventorySummary?.low_stock_count || 0}</Text>
                        <Text style={styles.statCardLabel}>Stock Bajo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statCard, styles.statCardDanger]} onPress={() => router.push('/(dashboard)/admin/reports/expiring')}>
                        <Text style={styles.statCardValue}>{inventorySummary?.expiring_soon_count || 0}</Text>
                        <Text style={styles.statCardLabel}>Por Caducar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statCard, styles.statCardInfo]}>
                        <Text style={styles.statCardValue}>{inventorySummary?.out_of_stock_count || 0}</Text>
                        <Text style={styles.statCardLabel}>Sin Stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statCard, styles.statCardSuccess]} onPress={() => router.push('/(dashboard)/admin/reports/summary')}>
                        <Text style={styles.statCardValue}>{inventorySummary?.total_products || 0}</Text>
                        <Text style={styles.statCardLabel}>Productos</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Alerts */}
                {lowStock?.critical_count > 0 && (
                    <TouchableOpacity style={styles.alertCard} onPress={() => router.push('/(dashboard)/admin/reports/low-stock')}>
                        <Text style={styles.alertTitle}>Alerta de Stock Crítico</Text>
                        <Text style={styles.alertText}>{lowStock.critical_count} producto(s) con stock crítico</Text>
                    </TouchableOpacity>
                )}

                {expiring?.expired_count > 0 && (
                    <TouchableOpacity style={[styles.alertCard, styles.alertCardDanger]} onPress={() => router.push('/(dashboard)/admin/reports/expiring')}>
                        <Text style={styles.alertTitle}>Productos Vencidos</Text>
                        <Text style={styles.alertText}>{expiring.expired_count} producto(s) vencidos</Text>
                    </TouchableOpacity>
                )}

                {expiring?.expiring_soon_count > 0 && (
                    <TouchableOpacity style={[styles.alertCard, styles.alertCardWarning]} onPress={() => router.push('/(dashboard)/admin/reports/expiring')}>
                        <Text style={styles.alertTitle}>Próximos a Vencer</Text>
                        <Text style={styles.alertText}>{expiring.expiring_soon_count} producto(s) por vencer en 30 días</Text>
                    </TouchableOpacity>
                )}

                {/* Items On Loan Summary */}
                <Text style={styles.sectionTitle}>Recursos Asignados</Text>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Items en Préstamo / Asignados</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{itemsOnLoan?.tools?.length || 0}</Text>
                            <Text style={styles.statLabel}>Herramientas</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{itemsOnLoan?.vehicles?.length || 0}</Text>
                            <Text style={styles.statLabel}>Vehículos</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{itemsOnLoan?.epps?.length || 0}</Text>
                            <Text style={styles.statLabel}>EPP</Text>
                        </View>
                    </View>
                </View>

                {/* Utilization Stats */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Top Utilización</Text>
                    
                    <Text style={styles.subtitle}>Herramientas más solicitadas</Text>
                    {utilization?.top_tools?.slice(0, 5).map((t: any, i: number) => (
                        <View key={i} style={styles.row}>
                            <Text>{t.name}</Text>
                            <Text style={styles.count}>{t.count}</Text>
                        </View>
                    ))}

                    <Text style={[styles.subtitle, { marginTop: 15 }]}>Vehículos más usados</Text>
                    {utilization?.top_vehicles?.slice(0, 5).map((v: any, i: number) => (
                        <View key={i} style={styles.row}>
                            <Text>{v.plate}</Text>
                            <Text style={styles.count}>{v.count}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    content: { padding: 15 },
    loader: { marginTop: 50 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 15, color: '#333' },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
    subtitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 10 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#007bff' },
    statLabel: { fontSize: 12, color: '#666' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
    count: { fontWeight: 'bold' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
    statCard: { width: '48%', backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2, alignItems: 'center' },
    statCardWarning: { borderLeftWidth: 4, borderLeftColor: Colors.warning },
    statCardDanger: { borderLeftWidth: 4, borderLeftColor: Colors.danger },
    statCardInfo: { borderLeftWidth: 4, borderLeftColor: Colors.info },
    statCardSuccess: { borderLeftWidth: 4, borderLeftColor: Colors.success },
    statCardValue: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    statCardLabel: { fontSize: 12, color: '#666', marginTop: 5 },
    alertCard: { backgroundColor: Colors.warning + '20', padding: 12, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: Colors.warning },
    alertCardDanger: { backgroundColor: Colors.danger + '20', borderLeftColor: Colors.danger },
    alertCardWarning: { backgroundColor: Colors.warning + '20', borderLeftColor: Colors.warning },
    alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    alertText: { fontSize: 12, color: '#666', marginTop: 4 },
});
