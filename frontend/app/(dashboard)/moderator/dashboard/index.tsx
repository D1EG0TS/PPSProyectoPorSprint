import React, { useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, useWindowDimensions } from 'react-native';
import { Text, Card, Button, useTheme, DataTable, ProgressBar, MD3Colors } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { useFocusEffect } from 'expo-router';
import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { 
    getVehicleCompliance, 
    getEPPExpiration,
    VehicleCompliance, 
    EPPExpiration 
} from '../../../../services/reportService';

export default function ModeratorDashboard() {
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [compliance, setCompliance] = useState<VehicleCompliance | null>(null);
    const [eppExpiration, setEppExpiration] = useState<EPPExpiration[]>([]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [compData, eppData] = await Promise.all([
                getVehicleCompliance(),
                getEPPExpiration(30) // 30 days lookahead
            ]);
            setCompliance(compData);
            setEppExpiration(eppData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const exportCSV = async () => {
        if (!compliance) return;
        
        let csvContent = "Reporte Operativo\n\n";
        csvContent += "Cumplimiento Vehicular\n";
        csvContent += `Total Vehiculos,${compliance.total_vehicles}\n`;
        csvContent += `Documentos Vencidos,${compliance.vehicles_with_expired_docs}\n`;
        csvContent += `Pendientes Validacion,${compliance.vehicles_pending_verification}\n`;
        csvContent += `Tasa Cumplimiento,${(compliance.compliance_rate * 100).toFixed(1)}%\n\n`;
        
        csvContent += "EPP Proximos a Vencer (30 dias)\n";
        csvContent += "Producto,Serial,Fecha Vencimiento,Dias Restantes\n";
        eppExpiration.forEach(e => {
            csvContent += `${e.product_name},${e.serial_number},${e.expiration_date},${e.days_until_expiration}\n`;
        });

        const fileName = 'reporte_operativo.csv';
        const fileUri = documentDirectory + fileName;

        try {
            await writeAsStringAsync(fileUri, csvContent, { encoding: EncodingType.UTF8 });
            await Sharing.shareAsync(fileUri);
        } catch (e) {
            console.error("Error exporting", e);
        }
    };

    const pieData = compliance ? [
        {
            name: "Al Día",
            population: compliance.total_vehicles - compliance.vehicles_with_expired_docs - compliance.vehicles_pending_verification,
            color: "#66bb6a",
            legendFontColor: "#7F7F7F",
            legendFontSize: 12
        },
        {
            name: "Vencidos",
            population: compliance.vehicles_with_expired_docs,
            color: "#ef5350",
            legendFontColor: "#7F7F7F",
            legendFontSize: 12
        },
        {
            name: "Pendientes",
            population: compliance.vehicles_pending_verification,
            color: "#ffa726",
            legendFontColor: "#7F7F7F",
            legendFontSize: 12
        }
    ] : [];

    const chartConfig = {
        backgroundGradientFrom: theme.colors.surface,
        backgroundGradientTo: theme.colors.surface,
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    };

    return (
        <ScrollableContent 
            containerStyle={styles.container}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        >
            <View style={styles.header}>
                <Text variant="headlineMedium">Dashboard Operativo</Text>
                <Button mode="contained" onPress={exportCSV} icon="download">Exportar CSV</Button>
            </View>

            {/* KPI Cards */}
            <View style={styles.kpiContainer}>
                <Card style={styles.kpiCard}>
                    <Card.Content>
                        <Text variant="titleMedium">Cumplimiento Vehicular</Text>
                        <Text variant="displaySmall" style={{color: theme.colors.primary}}>
                            {compliance ? `${(compliance.compliance_rate * 100).toFixed(0)}%` : '-'}
                        </Text>
                        <ProgressBar 
                            progress={compliance ? compliance.compliance_rate : 0} 
                            color={compliance && compliance.compliance_rate < 0.8 ? MD3Colors.error50 : MD3Colors.primary50} 
                            style={{marginTop: 8, height: 8, borderRadius: 4}}
                        />
                    </Card.Content>
                </Card>
                <Card style={styles.kpiCard}>
                    <Card.Content>
                        <Text variant="titleMedium">EPP por Vencer</Text>
                        <Text variant="displaySmall" style={{color: theme.colors.error}}>
                            {eppExpiration.length}
                        </Text>
                        <Text variant="bodySmall">En los próximos 30 días</Text>
                    </Card.Content>
                </Card>
            </View>

            {/* Charts */}
            <Card style={styles.chartCard}>
                <Card.Title title="Estado Documental de Flota" />
                <Card.Content>
                    {compliance && compliance.total_vehicles > 0 ? (
                        <PieChart
                            data={pieData}
                            width={width - 48}
                            height={220}
                            chartConfig={chartConfig}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"15"}
                            center={[10, 0]}
                            absolute
                        />
                    ) : <Text>No hay datos de vehículos</Text>}
                </Card.Content>
            </Card>

            {/* EPP Table */}
            <Card style={styles.chartCard}>
                <Card.Title title="Alertas de Caducidad EPP" />
                <DataTable>
                    <DataTable.Header>
                        <DataTable.Title>Equipo</DataTable.Title>
                        <DataTable.Title>Vence</DataTable.Title>
                        <DataTable.Title numeric>Días</DataTable.Title>
                    </DataTable.Header>

                    {eppExpiration.slice(0, 5).map((item) => (
                        <DataTable.Row key={item.id}>
                            <DataTable.Cell>{item.product_name} ({item.serial_number})</DataTable.Cell>
                            <DataTable.Cell>{item.expiration_date}</DataTable.Cell>
                            <DataTable.Cell numeric>
                                <Text style={{color: item.days_until_expiration < 0 ? 'red' : 'orange'}}>
                                    {item.days_until_expiration}
                                </Text>
                            </DataTable.Cell>
                        </DataTable.Row>
                    ))}

                    <DataTable.Pagination
                        page={0}
                        numberOfPages={1}
                        onPageChange={() => {}}
                        label={`${eppExpiration.length} alertas`}
                    />
                </DataTable>
            </Card>
            
            <View style={{height: 50}} />
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    kpiContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    kpiCard: {
        width: '48%',
    },
    chartCard: {
        marginBottom: 16,
    },
});
