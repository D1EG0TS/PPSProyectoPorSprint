import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Topbar } from '../../components/Topbar';
import { notificationService, Notification } from '../../services/notificationService';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await notificationService.getAll();
            setNotifications(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadNotifications();
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error(error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'LATE_RETURN': return 'alert-circle';
            case 'UPCOMING_EXPIRATION': return 'time';
            case 'PURCHASE_ALERT': return 'cart';
            case 'APPROVAL_NEEDED': return 'checkmark-circle';
            default: return 'information-circle';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'LATE_RETURN': return '#dc3545';
            case 'UPCOMING_EXPIRATION': return '#ffc107';
            case 'PURCHASE_ALERT': return '#17a2b8';
            case 'APPROVAL_NEEDED': return '#28a745';
            default: return '#007bff';
        }
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity 
            style={[styles.item, !item.is_read && styles.unreadItem]}
            onPress={() => handleMarkAsRead(item.id)}
        >
            <View style={[styles.iconContainer, { backgroundColor: getColor(item.type) }]}>
                <Ionicons name={getIcon(item.type) as any} size={24} color="white" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>
                    {format(new Date(item.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                </Text>
            </View>
            {!item.is_read && <View style={styles.dot} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Topbar title="Notificaciones" onBack={() => router.back()} />
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No tienes notificaciones</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    list: { padding: 15 },
    loader: { marginTop: 50 },
    item: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        elevation: 1,
        alignItems: 'center'
    },
    unreadItem: {
        backgroundColor: '#e8f0fe',
        borderLeftWidth: 4,
        borderLeftColor: '#007bff'
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    textContainer: { flex: 1 },
    title: { fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
    message: { color: '#555', fontSize: 14, marginBottom: 5 },
    date: { color: '#999', fontSize: 12 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007bff', marginLeft: 10 },
    empty: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#666', fontSize: 16 }
});
