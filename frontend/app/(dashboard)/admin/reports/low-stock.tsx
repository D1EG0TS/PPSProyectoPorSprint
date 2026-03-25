import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Topbar } from '../../../../components/Topbar';
import { inventoryService, LowStockItem } from '../../../../services/inventoryService';
import { Colors } from '../../../../constants/Colors';

export default function LowStockScreen() {
    const [products, setProducts] = useState<LowStockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, critical_count: 0, warning_count: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getLowStockProducts();
            setProducts(data.products);
            setStats({
                total: data.total,
                critical_count: data.critical_count,
                warning_count: data.warning_count
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStockColor = (percentage: number) => {
        if (percentage <= 50) return Colors.danger;
        if (percentage <= 100) return Colors.warning;
        return Colors.success;
    };

    const renderItem = ({ item }: { item: LowStockItem }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.productName}>{item.product_name}</Text>
                    <Text style={styles.sku}>SKU: {item.product_sku}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStockColor(item.stock_percentage) + '30' }]}>
                    <Text style={[styles.badgeText, { color: getStockColor(item.stock_percentage) }]}>
                        {Math.round(item.stock_percentage)}%
                    </Text>
                </View>
            </View>
            <View style={styles.stockBar}>
                <View style={[styles.stockFill, { 
                    width: `${Math.min(item.stock_percentage, 100)}%`,
                    backgroundColor: getStockColor(item.stock_percentage)
                }]} />
            </View>
            <View style={styles.details}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Stock Actual:</Text>
                    <Text style={styles.detailValue}>{item.current_stock}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Stock Mínimo:</Text>
                    <Text style={styles.detailValue}>{item.min_stock}</Text>
                </View>
                {item.max_stock && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Stock Máximo:</Text>
                        <Text style={styles.detailValue}>{item.max_stock}</Text>
                    </View>
                )}
                {item.category && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Categoría:</Text>
                        <Text style={styles.detailValue}>{item.category}</Text>
                    </View>
                )}
                {item.warehouse_name && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Almacén:</Text>
                        <Text style={styles.detailValue}>{item.warehouse_name}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    if (loading) return <ActivityIndicator size="large" color="#007bff" style={styles.loader} />;

    return (
        <View style={styles.container}>
            <Topbar title="Stock Bajo" />
            
            <View style={styles.statsContainer}>
                <View style={[styles.statBox, { borderLeftColor: Colors.danger }]}>
                    <Text style={styles.statValue}>{stats.critical_count}</Text>
                    <Text style={styles.statLabel}>Crítico</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: Colors.warning }]}>
                    <Text style={styles.statValue}>{stats.warning_count}</Text>
                    <Text style={styles.statLabel}>Advertencia</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: Colors.info }]}>
                    <Text style={styles.statValue}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
            </View>

            <FlatList
                data={products}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.product_id}-${index}`}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>No hay productos con stock bajo</Text>}
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    headerLeft: { flex: 1 },
    productName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    sku: { fontSize: 12, color: '#666', marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
    badgeText: { fontSize: 14, fontWeight: 'bold' },
    stockBar: { height: 8, backgroundColor: '#eee', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
    stockFill: { height: '100%', borderRadius: 4 },
    details: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    detailLabel: { fontSize: 13, color: '#666' },
    detailValue: { fontSize: 13, fontWeight: '600', color: '#333' },
    empty: { textAlign: 'center', color: '#666', marginTop: 50 },
});
