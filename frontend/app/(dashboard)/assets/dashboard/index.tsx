
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { assetService } from '../../../../services/assetService';
import { ScreenContainer } from '../../../../components/ScreenContainer';
import { Layout } from '../../../../constants/Layout';

export default function AssetsDashboardScreen() {
    const router = useRouter();
    const theme = useTheme();
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
            <View style={[styles.actionIcon, { backgroundColor: color, shadowColor: theme.colors.shadow }]}>
                <Ionicons name={icon} size={24} color="#fff" />
            </View>
            <Text style={[styles.actionText, { color: theme.colors.onSurface }]}>{title}</Text>
        </TouchableOpacity>
    );

    const StatCard = ({ title, value, subtext, icon, color }: any) => (
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <View>
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{value}</Text>
                <Text style={[styles.statTitle, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
                {subtext && <Text style={[styles.statSubtext, { color: theme.colors.onSurfaceVariant }]}>{subtext}</Text>}
            </View>
        </View>
    );

    const WidgetCard = ({ title, children, color = '#2196F3' }: any) => (
        <View style={[styles.widgetCard, { borderLeftColor: color, backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.widgetTitle, { color: theme.colors.onSurface }]}>{title}</Text>
            {children}
        </View>
    );

    return (
        <ScreenContainer 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
                <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Dashboard de Activos</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
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
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Accesos Rápidos</Text>
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
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Resumen Operativo</Text>
                    
                    {widgets && (
                        <View style={styles.widgetsContainer}>
                            
                            {/* Calibration Widget */}
                            <WidgetCard title="Calibraciones (Esta Semana)" color="#9C27B0">
                                <View style={styles.widgetContent}>
                                    <Text style={[styles.widgetBigNumber, { color: theme.colors.onSurface }]}>{widgets.calibrations_due_week}</Text>
                                    <Text style={[styles.widgetLabel, { color: theme.colors.onSurfaceVariant }]}>Equipos requieren atención</Text>
                                </View>
                            </WidgetCard>

                            {/* Warranty Widget */}
                            <WidgetCard title="Vencimiento de Garantías (30 días)" color="#F44336">
                                <View style={styles.widgetContent}>
                                    <Text style={[styles.widgetBigNumber, { color: theme.colors.onSurface }]}>{widgets.warranty_expiring_soon}</Text>
                                    <Text style={[styles.widgetLabel, { color: theme.colors.onSurfaceVariant }]}>Activos por vencer</Text>
                                </View>
                            </WidgetCard>

                            {/* Top Maintenance Costs */}
                            <WidgetCard title="Top 5 Costos Mantenimiento" color="#795548">
                                {widgets.top_maintenance_costs.length > 0 ? (
                                    widgets.top_maintenance_costs.map((item: any, index: number) => (
                                        <View key={index} style={[styles.topItem, { borderBottomColor: theme.colors.outline }]}>
                                            <View>
                                                <Text style={[styles.topItemName, { color: theme.colors.onSurface }]}>{item.name}</Text>
                                                <Text style={[styles.topItemTag, { color: theme.colors.onSurfaceVariant }]}>{item.tag}</Text>
                                            </View>
                                            <Text style={styles.topItemValue}>${item.cost.toLocaleString()}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>Sin registros recientes</Text>
                                )}
                            </WidgetCard>

                        </View>
                    )}
                </>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        padding: 20,
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        padding: 10,
        gap: 10,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
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
    },
    statTitle: {
        fontSize: 12,
        marginTop: 2,
    },
    statSubtext: {
        fontSize: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    actionText: {
        fontSize: 12,
        textAlign: 'center',
    },
    widgetsContainer: {
        paddingHorizontal: 20,
        gap: 16,
        paddingBottom: 40,
    },
    widgetCard: {
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    widgetTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    widgetContent: {
        alignItems: 'center',
    },
    widgetBigNumber: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    widgetLabel: {
        fontSize: 14,
    },
    topItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    topItemName: {
        fontSize: 14,
        fontWeight: '500',
    },
    topItemTag: {
        fontSize: 12,
    },
    topItemValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#D32F2F',
    },
    emptyText: {
        fontStyle: 'italic',
        textAlign: 'center',
    },
});
