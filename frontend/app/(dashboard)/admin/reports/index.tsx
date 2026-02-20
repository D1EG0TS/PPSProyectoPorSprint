import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Topbar } from '../../../../components/Topbar';
import { reportsService } from '../../../../services/reportsService';
import { useRouter } from 'expo-router';

export default function ReportsScreen() {
    const router = useRouter();
    const [itemsOnLoan, setItemsOnLoan] = useState<any>(null);
    const [utilization, setUtilization] = useState<any>(null);
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
                
                {/* Items On Loan Summary */}
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
                    {utilization?.top_tools?.map((t: any, i: number) => (
                        <View key={i} style={styles.row}>
                            <Text>{t.name}</Text>
                            <Text style={styles.count}>{t.count}</Text>
                        </View>
                    ))}

                    <Text style={[styles.subtitle, { marginTop: 15 }]}>Vehículos más usados</Text>
                    {utilization?.top_vehicles?.map((v: any, i: number) => (
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
    card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
    subtitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 10 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#007bff' },
    statLabel: { fontSize: 12, color: '#666' },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
    count: { fontWeight: 'bold' }
});
