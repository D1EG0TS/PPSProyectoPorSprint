import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Topbar } from '../../../../components/Topbar';
import { inventoryService, ExpiringProductItem } from '../../../../services/inventoryService';
import { Colors } from '../../../../constants/Colors';

export default function ExpiringProductsScreen() {
    const [products, setProducts] = useState<ExpiringProductItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, expired_count: 0, expiring_soon_count: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getExpiringProducts({ days_ahead: 30, include_expired: true });
            setProducts(data.products);
            setStats({
                total: data.total,
                expired_count: data.expired_count,
                expiring_soon_count: data.expiring_soon_count
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    };

    const getDaysColor = (days: number) => {
        if (days < 0) return Colors.danger;
        if (days <= 7) return Colors.warning;
        if (days <= 30) return Colors.info;
        return Colors.success;
    };

    const renderItem = ({ item }: { item: ExpiringProductItem }) => (
        <View style={[styles.card, item.is_expired && styles.cardExpired]}>
            <View style={styles.cardHeader}>
                <Text style={styles.productName}>{item.product_name}</Text>
                <View style={[styles.badge, { backgroundColor: getDaysColor(item.days_until_expiry) + '30' }]}>
                    <Text style={[styles.badgeText, { color: getDaysColor(item.days_until_expiry) }]}>
                        {item.is_expired ? 'VENCIDO' : `${item.days_until_expiry}d`}
                    </Text>
                </View>
            </View>
            <Text style={styles.sku}>SKU: {item.product_sku}</Text>
            <View style={styles.details}>
                <Text style={styles.detail}>Almacén: {item.warehouse_name}</Text>
                {item.location_code && <Text style={styles.detail}>Ubicación: {item.location_code}</Text>}
                <Text style={styles.detail}>Cantidad: {item.quantity}</Text>
                <Text style={styles.detail}>Vence: {formatDate(item.expiration_date)}</Text>
                {item.batch_number && <Text style={styles.detail}>Lote: {item.batch_number}</Text>}
            </View>
        </View>
    );

    if (loading) return <ActivityIndicator size="large" color="#007bff" style={styles.loader} />;

    return (
        <View style={styles.container}>
            <Topbar title="Productos por Vencer" />
            
            <View style={styles.statsContainer}>
                <View style={[styles.statBox, { borderLeftColor: Colors.danger }]}>
                    <Text style={styles.statValue}>{stats.expired_count}</Text>
                    <Text style={styles.statLabel}>Vencidos</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: Colors.warning }]}>
                    <Text style={styles.statValue}>{stats.expiring_soon_count}</Text>
                    <Text style={styles.statLabel}>Por Vencer</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: Colors.info }]}>
                    <Text style={styles.statValue}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
            </View>

            <FlatList
                data={products}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.product_id}-${item.batch_number}-${index}`}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>No hay productos próximos a vencer</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    loader: { marginTop: 50 },
    statsContainer: { flexDirection: 'row', padding: 15, backgroundColor: 'white', elevation: 2 },
    statBox: { flex: 1, alignItems: 'center', borderLeftWidth: 3, paddingLeft: 8 },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 12, color: '#666' },
    list: { padding: 15 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
    cardExpired: { borderLeftWidth: 4, borderLeftColor: Colors.danger },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    productName: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    sku: { fontSize: 12, color: '#666', marginBottom: 8 },
    details: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 },
    detail: { fontSize: 13, color: '#555', marginBottom: 4 },
    empty: { textAlign: 'center', color: '#666', marginTop: 50 },
});
