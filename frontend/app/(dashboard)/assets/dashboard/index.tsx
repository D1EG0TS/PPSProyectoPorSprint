import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { assetService } from '../../../../services/assetService';

export default function AssetsDashboardScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [widgets, setWidgets] = useState<any>(null);
    
    const fetchDashboardData = async () => {
        try {
            const data = await assetService.getDashboardWidgets();
            setWidgets(data);
        } catch (error) {
            console.error('Error fetching dashboard widgets:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const QuickAction = ({ icon, title, onPress, color }: any) => (
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
            <View style={[styles.actionIcon, { backgroundColor: color }]}>
                <Ionicons name={icon} size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>{title}</Text>
        </TouchableOpacity>
    );

    const StatCard = ({ title, value, subtext, icon, color }: any) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <View>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statTitle}>{title}</Text>
                {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
            </View>
        </View>
    );

    const WidgetCard = ({ title, children, color = '#2196F3' }: any) => (
        <View style={[styles.widgetCard, { borderLeftColor: color }]}>
            <Text style={styles.widgetTitle}>{title}</Text>
            {children}
        </View>
    );

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Dashboard de Activos</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
            ) : (
                <>
                    {/* Main Stats */}
                    {widgets && (
                        <View style={styles.statsRow}>
                             <StatCard 
                                title="Valor Total" 
                                value={`$${widgets.total_inventory_value.toLocaleString()}`} 
                                icon="cash" 
                                color="#4CAF50" 
                            />
                            <StatCard 
                                title="Activos Sin Asignar" 
                                value={widgets.unassigned_assets} 
                                icon="cube-off-outline" 
                                color="#FF9800" 
                            />
                        </View>
                    )}

                    {/* Quick Actions */}
                    <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
                    <View style={styles.actionsContainer}>
                        <QuickAction 
                            icon="add-circle-outline" 
                            title="Nuevo Activo" 
                            onPress={() => router.push('/assets/create')}
                            color="#007AFF" 
                        />
                        <QuickAction 
                            icon="list-outline" 
                            title="Inventario" 
                            onPress={() => router.push('/assets/inventory')}
                            color="#673AB7" 
                        />
                        <QuickAction 
                            icon="bar-chart-outline" 
                            title="Reportes" 
                            onPress={() => router.push('/assets/reports')} // Placeholder for reports screen
                            color="#FF5722" 
                        />
                    </View>

                    {/* Widgets Section */}
                    <Text style={styles.sectionTitle}>Resumen Operativo</Text>
                    
                    {widgets && (
                        <View style={styles.widgetsContainer}>
                            
                            {/* Calibration Widget */}
                            <WidgetCard title="Calibraciones (Esta Semana)" color="#9C27B0">
                                <View style={styles.widgetContent}>
                                    <Text style={styles.widgetBigNumber}>{widgets.calibrations_due_week}</Text>
                                    <Text style={styles.widgetLabel}>Equipos requieren atención</Text>
                                </View>
                            </WidgetCard>

                            {/* Warranty Widget */}
                            <WidgetCard title="Vencimiento de Garantías (30 días)" color="#F44336">
                                <View style={styles.widgetContent}>
                                    <Text style={styles.widgetBigNumber}>{widgets.warranty_expiring_soon}</Text>
                                    <Text style={styles.widgetLabel}>Activos por vencer</Text>
                                </View>
                            </WidgetCard>

                            {/* Top Maintenance Costs */}
                            <WidgetCard title="Top 5 Costos Mantenimiento" color="#795548">
                                {widgets.top_maintenance_costs.length > 0 ? (
                                    widgets.top_maintenance_costs.map((item: any, index: number) => (
                                        <View key={index} style={styles.topItem}>
                                            <View>
                                                <Text style={styles.topItemName}>{item.name}</Text>
                                                <Text style={styles.topItemTag}>{item.tag}</Text>
                                            </View>
                                            <Text style={styles.topItemValue}>${item.cost.toLocaleString()}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.emptyText}>Sin registros recientes</Text>
                                )}
                            </WidgetCard>

                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statsRow: {
        flexDirection: 'row',
        padding: 10,
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statTitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    statSubtext: {
        fontSize: 10,
        color: '#999',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginHorizontal: 20,
        marginTop: 24,
        marginBottom: 12,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 16,
    },
    actionButton: {
        alignItems: 'center',
        width: 80,
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    actionText: {
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
    },
    widgetsContainer: {
        paddingHorizontal: 20,
        gap: 16,
        paddingBottom: 40,
    },
    widgetCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    widgetTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    widgetContent: {
        alignItems: 'center',
    },
    widgetBigNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
    },
    widgetLabel: {
        fontSize: 14,
        color: '#666',
    },
    topItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    topItemName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    topItemTag: {
        fontSize: 12,
        color: '#888',
    },
    topItemValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#D32F2F',
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
    },
});
