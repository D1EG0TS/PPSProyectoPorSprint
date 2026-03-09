
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, RefreshControl, ScrollView } from 'react-native';
import { Text, useTheme, SegmentedButtons } from 'react-native-paper';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useFocusEffect } from 'expo-router';
import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
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
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<InventorySummary | null>(null);
    const [turnover, setTurnover] = useState<InventoryTurnover[]>([]);
    const [movements, setMovements] = useState<MovementDaily[]>([]);
    const [period, setPeriod] = useState<string>('30'); // days

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
        // Group daily movements for Bar Chart (Total Movements per Day)
        const dateMap = new Map<string, number>();
        movements.forEach(m => {
            const current = dateMap.get(m.date) || 0;
            dateMap.set(m.date, current + m.total_quantity);
        });
        
        // Sort dates
        const sortedDates = Array.from(dateMap.keys()).sort().slice(-7); // Last 7 days for readability
        const dataPoints = sortedDates.map(d => dateMap.get(d) || 0);

        return {
            labels: sortedDates.map(d => d.split('-').slice(1).join('/')), // MM/DD
            datasets: [{ data: dataPoints }]
        };
    };

    const pieData = turnover.slice(0, 5).map((t, index) => ({
        name: t.category,
        population: t.total_out,
        color: ['#e57373', '#81c784', '#64b5f6', '#ffd54f', '#ba68c8'][index % 5],
        legendFontColor: theme.colors.onSurface,
        legendFontSize: 12
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
                <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>Dashboard Administrativo</Text>
                <Button variant="primary" onPress={exportCSV} icon="download">Exportar CSV</Button>
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

            {/* KPI Cards */}
            <View style={styles.kpiContainer}>
                <Card style={styles.kpiCard}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Valor Inventario</Text>
                    <Text variant="headlineSmall" style={{color: theme.colors.primary}}>
                        ${summary?.total_value.toLocaleString()}
                    </Text>
                </Card>
                <Card style={styles.kpiCard}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Total Items</Text>
                    <Text variant="headlineSmall" style={{color: theme.colors.onSurface}}>
                        {summary?.total_items.toLocaleString()}
                    </Text>
                </Card>
            </View>

            {/* Charts */}
            <Card title="Movimientos (Últimos 7 días activos)" style={styles.chartCard}>
                {movements.length > 0 ? (
                    <ScrollView horizontal>
                        <BarChart
                            data={processChartData()}
                            width={width > 600 ? width - 80 : width - 48}
                            height={220}
                            yAxisLabel=""
                            yAxisSuffix=""
                            chartConfig={chartConfig}
                            verticalLabelRotation={30}
                        />
                    </ScrollView>
                ) : <Text>No hay datos suficientes</Text>}
            </Card>

            <Card title="Top Categorías (Salidas)" style={styles.chartCard}>
                {turnover.length > 0 ? (
                    <PieChart
                        data={pieData}
                        width={width > 600 ? width - 80 : width - 48}
                        height={220}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                    />
                ) : <Text>No hay datos de salidas</Text>}
            </Card>

            <Card title="Detalle por Categoría" style={styles.chartCard}>
                <View style={[styles.tableRow, { borderBottomColor: theme.colors.outline }]}>
                    <Text style={[styles.tableHeader, {flex: 2, color: theme.colors.onSurface}]}>Categoría</Text>
                    <Text style={[styles.tableHeader, {flex: 1, color: theme.colors.onSurface}]}>Salidas</Text>
                    <Text style={[styles.tableHeader, {flex: 1, color: theme.colors.onSurface}]}>Movs</Text>
                </View>
                {turnover.slice(0, 10).map((t, i) => (
                    <View key={i} style={[styles.tableRow, { borderBottomColor: theme.colors.outline }]}>
                        <Text style={{flex: 2, color: theme.colors.onSurface}}>{t.category}</Text>
                        <Text style={{flex: 1, color: theme.colors.onSurface}}>{t.total_out}</Text>
                        <Text style={{flex: 1, color: theme.colors.onSurface}}>{t.movement_count}</Text>
                    </View>
                ))}
            </Card>
            
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
    filters: {
        marginBottom: Layout.spacing.md,
    },
    segment: {
        width: '100%',
        maxWidth: 400,
    },
    kpiContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Layout.spacing.md,
        flexWrap: 'wrap',
        gap: Layout.spacing.md,
    },
    kpiCard: {
        flex: 1,
        minWidth: 150,
    },
    chartCard: {
        marginBottom: Layout.spacing.md,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: Layout.spacing.sm,
        borderBottomWidth: 1,
    },
    tableHeader: {
        fontWeight: 'bold',
    }
});
