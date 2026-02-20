import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Topbar } from '../../../../../components/Topbar';
import { integratedRequestService } from '../../../../../services/integratedRequestService';
import { IntegratedRequest, IntegratedRequestStatus } from '../../../../../types/integratedRequest';
import { format } from 'date-fns';

export default function ModeratorRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<IntegratedRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<IntegratedRequestStatus | 'ALL'>('ALL');

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

    const filteredRequests = requests.filter(r => {
        if (filter === 'ALL') return true;
        return r.status === filter;
    });

    const getStatusColor = (status: IntegratedRequestStatus) => {
        switch (status) {
            case IntegratedRequestStatus.PENDIENTE: return '#ffc107';
            case IntegratedRequestStatus.APROBADA: return '#28a745';
            case IntegratedRequestStatus.RECHAZADA: return '#dc3545';
            default: return '#333';
        }
    };

    const renderItem = ({ item }: { item: IntegratedRequest }) => (
        <TouchableOpacity 
            style={styles.card} 
            onPress={() => router.push(`/(dashboard)/moderator/requests/integrated/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.requestNumber}>{item.request_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.purpose}>{item.purpose}</Text>
            <Text style={styles.requester}>Requested by: User #{item.requested_by}</Text>
            <Text style={styles.date}>{format(new Date(item.created_at), 'yyyy-MM-dd HH:mm')}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Topbar title="Request Management" />
            
            <View style={styles.filters}>
                <TouchableOpacity onPress={() => setFilter('ALL')} style={[styles.filterChip, filter === 'ALL' && styles.activeFilter]}>
                    <Text>All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilter(IntegratedRequestStatus.PENDIENTE)} style={[styles.filterChip, filter === IntegratedRequestStatus.PENDIENTE && styles.activeFilter]}>
                    <Text>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilter(IntegratedRequestStatus.APROBADA)} style={[styles.filterChip, filter === IntegratedRequestStatus.APROBADA && styles.activeFilter]}>
                    <Text>Approved</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color="#007bff" />
                ) : (
                    <FlatList
                        data={filteredRequests}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        refreshing={loading}
                        onRefresh={fetchRequests}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    filters: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: 'white',
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: '#eee',
        marginRight: 8,
    },
    activeFilter: {
        backgroundColor: '#007bff',
    },
    content: {
        flex: 1,
    },
    list: {
        padding: 10,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    requestNumber: {
        fontWeight: 'bold',
        fontSize: 16,
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
        color: '#555',
        marginBottom: 2,
    },
    requester: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
});
