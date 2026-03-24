import React, { useState, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, RefreshControl, ScrollView } from 'react-native';
import { Text, useTheme, SegmentedButtons, Card, IconButton, Chip, Button, Divider } from 'react-native-paper';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Card as CustomCard } from '../../../../components/Card';
import { Layout } from '../../../../constants/Layout';
import { 
    getInventorySummary, 
    getInventoryTurnover, 
    getMovementsDaily,
    InventorySummary, 
    InventoryTurnover, 
    MovementDaily 
} from '../../../../services/reportService';

export default function AdminDashboard() {
    const router = useRouter();
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<InventorySummary | null>(null);
    const [turnover, setTurnover] = useState<InventoryTurnover[]>([]);
    const [movements, setMovements] = useState<MovementDaily[]>([]);
    const [period, setPeriod] = useState<string>('30');

    const loadData = async () => {
        try {
            setLoading(true);
            const days = parseInt(period);
            const [sumData, turnData, movData] = await Promise.all([
                getInventorySummary(),
                getInventoryTurnover(days),
                getMovementsDaily(days)
            ]);
            setSummary(sumData);
            setTurnover(turnData);
            setMovements(movData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [period])
    );

    const exportCSV = async () => {
        if (!summary) return;
        
        let csvContent = "Reporte de Inventario\n\n";
        csvContent += "Resumen General\n";
        csvContent += `Items Totales,${summary.total_items}\n`;
        csvContent += `Valor Total,${summary.total_value}\n`;
        csvContent += `Productos,${summary.total_products}\n\n`;
        
        csvContent += "Rotacion por Categoria\n";
        csvContent += "Categoria,Total Salidas,Movimientos\n";
        turnover.forEach(t => {
            csvContent += `${t.category},${t.total_out},${t.movement_count}\n`;
        });
        
        csvContent += "\nMovimientos Diarios\n";
        csvContent += "Fecha,Tipo,Cantidad\n";
        movements.forEach(m => {
            csvContent += `${m.date},${m.type},${m.total_quantity}\n`;
        });

        const fileName = 'reporte_dashboard.csv';
        const fileUri = documentDirectory + fileName;

        try {
            await writeAsStringAsync(fileUri, csvContent, { encoding: EncodingType.UTF8 });
            await Sharing.shareAsync(fileUri);
        } catch (e) {
            console.error("Error exporting", e);
        }
    };

    const processChartData = () => {
        const dateMap = new Map<string, number>();
        movements.forEach(m => {
            const current = dateMap.get(m.date) || 0;
            dateMap.set(m.date, current + m.total_quantity);
        });
        
        const sortedDates = Array.from(dateMap.keys()).sort().slice(-7);
        const dataPoints = sortedDates.map(d => dateMap.get(d) || 0);

        return {
            labels: sortedDates.map(d => d.split('-').slice(1).join('/')),
            datasets: [{ data: dataPoints }]
        };
    };

    const pieData = turnover.slice(0, 5).map((t, index) => ({
        name: t.category,
        population: t.total_out,
        color: ['#e57373', '#81c784', '#64b5f6', '#ffd54f', '#ba68c8'][index % 5],
        legendFontColor: theme.colors.onSurface,
        legendFontSize: 11
    }));

    const chartConfig = {
        backgroundGradientFrom: theme.colors.surface,
        backgroundGradientTo: theme.colors.surface,
        color: (opacity = 1) => theme.colors.primary,
        labelColor: (opacity = 1) => theme.colors.onSurface,
        strokeWidth: 2,
    };

    return (
        <ScreenContainer 
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        >
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>
                        Dashboard Administrativo
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Resumen de gestión integral
                    </Text>
                </View>
                <Button variant="primary" onPress={exportCSV} icon="download">
                    Exportar
                </Button>
            </View>

            <View style={styles.quickActions}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Chip icon="package-variant" onPress={() => router.push('/admin/inventory')} style={styles.quickChip}>
                        Inventario
                    </Chip>
                    <Chip icon="map-marker-path" onPress={() => router.push('/admin/traceability')} style={styles.quickChip}>
                        Trazabilidad
                    </Chip>
                    <Chip icon="map-marker-multiple" onPress={() => router.push('/admin/locations')} style={styles.quickChip}>
                        Ubicaciones
                    </Chip>
                    <Chip icon="swap-horizontal-bold" onPress={() => router.push('/admin/movements')} style={styles.quickChip}>
                        Movimientos
                    </Chip>
                </ScrollView>
            </View>

            <View style={styles.filters}>
                <SegmentedButtons
                    value={period}
                    onValueChange={setPeriod}
                    buttons={[
                        { value: '7', label: '7D' },
                        { value: '30', label: '30D' },
                        { value: '90', label: '90D' },
                    ]}
                    style={styles.segment}
                />
            </View>

            <View style={styles.kpiContainer}>
                <Card style={[styles.kpiCard, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Card.Content>
                        <View style={styles.kpiHeader}>
                            <IconButton icon="currency-usd" size={20} iconColor={theme.colors.onPrimaryContainer} style={{ margin: 0 }} />
                            <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>Valor Inventario</Text>
                        </View>
                        <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
                            ${summary?.total_value.toLocaleString()}
                        </Text>
                    </Card.Content>
                </Card>
                <Card style={[styles.kpiCard, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <Card.Content>
                        <View style={styles.kpiHeader}>
                            <IconButton icon="package-variant" size={20} iconColor={theme.colors.onSecondaryContainer} style={{ margin: 0 }} />
                            <Text variant="labelSmall" style={{ color: theme.colors.onSecondaryContainer }}>Total Items</Text>
                        </View>
                        <Text variant="headlineSmall" style={{ color: theme.colors.onSecondaryContainer, fontWeight: 'bold' }}>
                            {summary?.total_items.toLocaleString()}
                        </Text>
                    </Card.Content>
                </Card>
                <Card style={[styles.kpiCard, { backgroundColor: '#fff3e0' }]}>
                    <Card.Content>
                        <View style={styles.kpiHeader}>
                            <IconButton icon="chart-bar" size={20} iconColor="#e65100" style={{ margin: 0 }} />
                            <Text variant="labelSmall" style={{ color: '#e65100' }}>Productos</Text>
                        </View>
                        <Text variant="headlineSmall" style={{ color: '#e65100', fontWeight: 'bold' }}>
                            {summary?.total_products?.toLocaleString() || 0}
                        </Text>
                    </Card.Content>
                </Card>
                <Card style={[styles.kpiCard, { backgroundColor: '#e8f5e9' }]}>
                    <Card.Content>
                        <View style={styles.kpiHeader}>
                            <IconButton icon="swap-horizontal" size={20} iconColor="#2e7d32" style={{ margin: 0 }} />
                            <Text variant="labelSmall" style={{ color: '#2e7d32' }}>Movimientos</Text>
                        </View>
                        <Text variant="headlineSmall" style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                            {movements.length > 0 ? movements.reduce((acc, m) => acc + m.total_quantity, 0).toLocaleString() : 0}
                        </Text>
                    </Card.Content>
                </Card>
            </View>

            <View style={styles.chartsRow}>
                <CustomCard title="Movimientos (Últimos 7 días)" style={styles.chartCard}>
                    {movements.length > 0 ? (
                        <ScrollView horizontal>
                            <BarChart
                                data={processChartData()}
                                width={width > 600 ? (width - 80) / 2 : width - 48}
                                height={180}
                                yAxisLabel=""
                                yAxisSuffix=""
                                chartConfig={chartConfig}
                                verticalLabelRotation={30}
                            />
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyChart}>
                            <IconButton icon="chart-bar" size={48} />
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>No hay datos</Text>
                        </View>
                    )}
                </CustomCard>

                <CustomCard title="Top Categorías (Salidas)" style={styles.chartCard}>
                    {turnover.length > 0 ? (
                        <PieChart
                            data={pieData}
                            width={width > 600 ? (width - 80) / 2 : width - 48}
                            height={180}
                            chartConfig={chartConfig}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"15"}
                            center={[10, 0]}
                            absolute
                        />
                    ) : (
                        <View style={styles.emptyChart}>
                            <IconButton icon="chart-pie" size={48} />
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>No hay datos</Text>
                        </View>
                    )}
                </CustomCard>
            </View>

            <CustomCard title="Detalle por Categoría" style={styles.tableCard}>
                <View style={[styles.tableHeaderRow, { borderBottomColor: theme.colors.outline }]}>
                    <Text style={[styles.tableHeader, { flex: 2, color: theme.colors.onSurfaceVariant }]}>Categoría</Text>
                    <Text style={[styles.tableHeader, { flex: 1, color: theme.colors.onSurfaceVariant, textAlign: 'right' }]}>Salidas</Text>
                    <Text style={[styles.tableHeader, { flex: 1, color: theme.colors.onSurfaceVariant, textAlign: 'right' }]}>Movs</Text>
                </View>
                {turnover.slice(0, 10).map((t, i) => (
                    <View key={i} style={[styles.tableRow, { borderBottomColor: theme.colors.outline }]}>
                        <Text style={{ flex: 2, color: theme.colors.onSurface }}>{t.category}</Text>
                        <Text style={{ flex: 1, color: theme.colors.onSurface, textAlign: 'right', fontWeight: 'bold' }}>{t.total_out}</Text>
                        <Text style={{ flex: 1, color: theme.colors.onSurfaceVariant, textAlign: 'right' }}>{t.movement_count}</Text>
                    </View>
                ))}
                {turnover.length === 0 && (
                    <View style={styles.emptyTable}>
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>No hay categorías registradas</Text>
                    </View>
                )}
            </CustomCard>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
        flexWrap: 'wrap',
        gap: Layout.spacing.sm,
    },
    quickActions: {
        marginBottom: Layout.spacing.md,
    },
    quickChip: {
        marginRight: 8,
    },
    filters: {
        marginBottom: Layout.spacing.md,
    },
    segment: {
        maxWidth: 300,
    },
    kpiContainer: {
        flexDirection: 'row',
        marginBottom: Layout.spacing.md,
        flexWrap: 'wrap',
        gap: Layout.spacing.sm,
    },
    kpiCard: {
        flex: 1,
        minWidth: 140,
    },
    kpiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    chartsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Layout.spacing.md,
        marginBottom: Layout.spacing.md,
    },
    chartCard: {
        flex: 1,
        minWidth: 280,
    },
    tableCard: {
        marginBottom: Layout.spacing.md,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        paddingVertical: Layout.spacing.sm,
        borderBottomWidth: 1,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: Layout.spacing.sm,
        borderBottomWidth: 1,
    },
    tableHeader: {
        fontWeight: 'bold',
    },
    emptyChart: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTable: {
        padding: Layout.spacing.lg,
        alignItems: 'center',
    },
});
