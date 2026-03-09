
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { AssetTypeSelector } from '../../../../components/assets/AssetTypeSelector';
import { Asset, AssetType } from '../../../../types/assets';
import { assetService } from '../../../../services/assetService';
import { ScreenContainer } from '../../../../components/ScreenContainer';

export default function AssetInventoryScreen() {
    const router = useRouter();
    const theme = useTheme();
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
            style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}
            onPress={() => router.push(`/assets/${asset.id}`)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.tagContainer}>
                    <Text style={[styles.assetTag, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurfaceVariant }]}>{asset.asset_tag}</Text>
                    {asset.category && (
                        <Text style={[styles.categoryName, { color: theme.colors.onSurfaceVariant }]}>{asset.category.name}</Text>
                    )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(asset.status) }]}>
                    <Text style={styles.statusText}>{asset.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.cardContent}>
                <Text style={[styles.assetName, { color: theme.colors.onSurface }]}>{asset.name}</Text>
                <View style={styles.row}>
                    <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Marca/Modelo:</Text>
                    <Text style={[styles.value, { color: theme.colors.onSurface }]}>{asset.brand} {asset.model}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Serie:</Text>
                    <Text style={[styles.value, { color: theme.colors.onSurface }]}>{asset.serial_number}</Text>
                </View>
                {asset.responsible_user_id && (
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Responsable:</Text>
                        <Text style={[styles.value, { color: theme.colors.onSurface }]}>ID: {asset.responsible_user_id}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenContainer 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>Inventario de Activos</Text>
                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => router.push('/assets/create')}
                >
                    <Ionicons name="add" size={24} color={theme.colors.onPrimary} />
                    <Text style={[styles.addButtonText, { color: theme.colors.onPrimary }]}>Nuevo</Text>
                </TouchableOpacity>
            </View>

            <AssetTypeSelector 
                selectedType={selectedType} 
                onSelect={setSelectedType} 
            />

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
            ) : (
                <View style={styles.listContent}>
                    {assets.length > 0 ? (
                        assets.map(renderAssetItem)
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="cube-outline" size={48} color={theme.colors.onSurfaceVariant} />
                            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No se encontraron activos</Text>
                        </View>
                    )}
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        fontWeight: '600',
        marginLeft: 4,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    listContent: {
        padding: 16,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 12,
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
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        marginTop: 8,
        fontSize: 16,
    },
});
