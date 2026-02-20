import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Topbar } from '../../../../components/Topbar';
import { integratedRequestService } from '../../../../services/integratedRequestService';
import { IntegratedRequest, RequestToolStatus, RequestVehicleStatus, RequestEPPStatus, RequestItemStatus } from '../../../../types/integratedRequest';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export default function PendingReturnsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<IntegratedRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const allRequests = await integratedRequestService.getAll(0, 100);
            // Filter requests that have items in 'EN_DEVOLUCION' status
            const pendingReturns = allRequests.filter((req: IntegratedRequest) => {
                const hasToolReturn = req.tools.some((t: any) => t.status === RequestToolStatus.EN_DEVOLUCION);
                const hasVehicleReturn = req.vehicles.some((v: any) => v.status === RequestVehicleStatus.EN_DEVOLUCION);
                const hasEPPReturn = req.epp_items.some((e: any) => e.status === RequestEPPStatus.EN_DEVOLUCION);
                const hasProductReturn = req.items.some((i: any) => i.status === RequestItemStatus.EN_DEVOLUCION);
                return hasToolReturn || hasVehicleReturn || hasEPPReturn || hasProductReturn;
            });
            setRequests(pendingReturns);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: IntegratedRequest }) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/(dashboard)/moderator/returns/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.requestNumber}>{item.request_number}</Text>
                <Text style={styles.date}>{format(new Date(item.created_at), 'yyyy-MM-dd')}</Text>
            </View>
            <Text style={styles.requester}>Solicitante: {item.requested_by}</Text>
            <View style={styles.badges}>
                {item.tools.some(t => t.status === RequestToolStatus.EN_DEVOLUCION) && (
                    <View style={[styles.badge, { backgroundColor: '#ffc107' }]}>
                        <Ionicons name="construct" size={12} color="black" />
                        <Text style={styles.badgeText}>Herramientas</Text>
                    </View>
                )}
                {item.vehicles.some(v => v.status === RequestVehicleStatus.EN_DEVOLUCION) && (
                    <View style={[styles.badge, { backgroundColor: '#17a2b8' }]}>
                        <Ionicons name="car" size={12} color="white" />
                        <Text style={[styles.badgeText, { color: 'white' }]}>Vehículos</Text>
                    </View>
                )}
                {item.epp_items.some(e => e.status === RequestEPPStatus.EN_DEVOLUCION) && (
                    <View style={[styles.badge, { backgroundColor: '#28a745' }]}>
                        <Ionicons name="shield" size={12} color="white" />
                        <Text style={[styles.badgeText, { color: 'white' }]}>EPP</Text>
                    </View>
                )}
                {item.items.some(i => i.status === RequestItemStatus.EN_DEVOLUCION) && (
                    <View style={[styles.badge, { backgroundColor: '#6c757d' }]}>
                        <Ionicons name="cube" size={12} color="white" />
                        <Text style={[styles.badgeText, { color: 'white' }]}>Productos</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Topbar title="Devoluciones Pendientes" onBack={() => router.back()} />
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.emptyText}>No hay devoluciones pendientes</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    list: { padding: 15 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    requestNumber: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    date: { color: '#666', fontSize: 14 },
    requester: { fontSize: 14, color: '#555', marginBottom: 10 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#666' }
});
