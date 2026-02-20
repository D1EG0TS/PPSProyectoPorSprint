import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Topbar } from '../../../../../components/Topbar';
import { integratedRequestService } from '../../../../../services/integratedRequestService';
import { IntegratedRequest, IntegratedRequestStatus } from '../../../../../types/integratedRequest';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function IntegratedRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<IntegratedRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await integratedRequestService.getAll();
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const getStatusColor = (status: IntegratedRequestStatus) => {
        switch (status) {
            case IntegratedRequestStatus.BORRADOR: return '#6c757d';
            case IntegratedRequestStatus.PENDIENTE: return '#ffc107';
            case IntegratedRequestStatus.APROBADA: return '#28a745';
            case IntegratedRequestStatus.RECHAZADA: return '#dc3545';
            case IntegratedRequestStatus.ENTREGADA: return '#17a2b8';
            case IntegratedRequestStatus.COMPLETADA: return '#28a745';
            default: return '#333';
        }
    };

    const renderItem = ({ item }: { item: IntegratedRequest }) => (
        <TouchableOpacity 
            style={styles.card} 
            onPress={() => router.push(`/(dashboard)/operator/requests/integrated/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.requestNumber}>{item.request_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.purpose}>{item.purpose}</Text>
            {item.project_code && <Text style={styles.projectCode}>Project: {item.project_code}</Text>}
            <Text style={styles.date}>Created: {format(new Date(item.created_at), 'yyyy-MM-dd')}</Text>
            
            <View style={styles.summary}>
                {item.items.length > 0 && <Text style={styles.summaryText}>{item.items.length} Products</Text>}
                {item.tools.length > 0 && <Text style={styles.summaryText}>{item.tools.length} Tools</Text>}
                {item.epp_items.length > 0 && <Text style={styles.summaryText}>{item.epp_items.length} EPP</Text>}
                {item.vehicles.length > 0 && <Text style={styles.summaryText}>{item.vehicles.length} Vehicles</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Topbar title="Integrated Requests" />
            
            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
                ) : (
                    <FlatList
                        data={requests}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        refreshing={loading}
                        onRefresh={fetchRequests}
                        ListEmptyComponent={<Text style={styles.emptyText}>No requests found.</Text>}
                    />
                )}
            </View>

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => router.push('/(dashboard)/operator/requests/new-integrated')}
            >
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        flex: 1,
    },
    list: {
        padding: 10,
    },
    loader: {
        marginTop: 50,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    requestNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    purpose: {
        fontSize: 14,
        color: '#555',
        marginBottom: 2,
    },
    projectCode: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginBottom: 2,
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginBottom: 8,
    },
    summary: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 5,
    },
    summaryText: {
        fontSize: 11,
        color: '#007bff',
        marginRight: 10,
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#666',
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#007bff',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});
