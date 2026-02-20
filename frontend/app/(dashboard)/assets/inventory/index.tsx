import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { AssetTypeSelector } from '../../../../components/assets/AssetTypeSelector';
import { Asset, AssetType } from '../../../../types/assets';
import { assetService } from '../../../../services/assetService';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function AssetInventoryScreen() {
    const router = useRouter();
    const [selectedType, setSelectedType] = useState<AssetType | 'ALL'>('ALL');
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAssets = async () => {
        try {
            const params: any = {};
            if (selectedType !== 'ALL') {
                params.type = selectedType;
            }
            const data = await assetService.getAssets(params);
            setAssets(data);
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchAssets();
    }, [selectedType]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAssets();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'disponible': return '#4CAF50';
            case 'asignado': return '#2196F3';
            case 'en_mantenimiento': return '#FF9800';
            case 'en_calibracion': return '#9C27B0';
            case 'baja': return '#F44336';
            default: return '#757575';
        }
    };

    const renderAssetItem = (asset: Asset) => (
        <TouchableOpacity 
            key={asset.id} 
            style={styles.card}
            onPress={() => router.push(`/assets/${asset.id}`)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.tagContainer}>
                    <Text style={styles.assetTag}>{asset.asset_tag}</Text>
                    {asset.category && (
                        <Text style={styles.categoryName}>{asset.category.name}</Text>
                    )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(asset.status) }]}>
                    <Text style={styles.statusText}>{asset.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.assetName}>{asset.name}</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>Marca/Modelo:</Text>
                    <Text style={styles.value}>{asset.brand} {asset.model}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Serie:</Text>
                    <Text style={styles.value}>{asset.serial_number}</Text>
                </View>
                {asset.responsible_user_id && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Responsable:</Text>
                        <Text style={styles.value}>ID: {asset.responsible_user_id}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Inventario de Activos</Text>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => router.push('/assets/create')}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={styles.addButtonText}>Nuevo</Text>
                </TouchableOpacity>
            </View>

            <AssetTypeSelector 
                selectedType={selectedType} 
                onSelect={setSelectedType} 
            />

            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {assets.length > 0 ? (
                        assets.map(renderAssetItem)
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="cube-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No se encontraron activos</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 4,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    tagContainer: {
        flex: 1,
    },
    assetTag: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        backgroundColor: '#f0f0f0',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 12,
        color: '#888',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardContent: {
        gap: 4,
    },
    assetName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        color: '#666',
    },
    value: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        marginTop: 8,
        color: '#888',
        fontSize: 16,
    },
});
