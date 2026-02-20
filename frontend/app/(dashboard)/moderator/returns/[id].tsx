import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Topbar } from '../../../../components/Topbar';
import { integratedRequestService } from '../../../../services/integratedRequestService';
import { IntegratedRequest, RequestToolStatus, RequestVehicleStatus, RequestEPPStatus, RequestItemStatus } from '../../../../types/integratedRequest';
import { Ionicons } from '@expo/vector-icons';

export default function ProcessReturnScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [request, setRequest] = useState<IntegratedRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingItems, setProcessingItems] = useState<Record<string, boolean>>({});
    const [itemData, setItemData] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchRequest();
    }, [id]);

    const fetchRequest = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await integratedRequestService.getById(Number(id));
            setRequest(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load request');
        } finally {
            setLoading(false);
        }
    };

    const updateItemData = (key: string, field: string, value: any) => {
        setItemData(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };

    const handleConfirmReturn = async (type: 'tool' | 'vehicle' | 'epp' | 'product', itemId: number) => {
        if (!request) return;
        
        const key = `${type}_${itemId}`;
        setProcessingItems(prev => ({ ...prev, [key]: true }));
        
        try {
            if (type === 'tool') {
                await integratedRequestService.updateToolStatus(
                    request.id, 
                    itemId, 
                    RequestToolStatus.DEVUELTA,
                    {
                        condition_in: itemData[key]?.condition_in // Optional override or confirmation
                    }
                );
            } else if (type === 'vehicle') {
                await integratedRequestService.updateVehicleStatus(
                    request.id, 
                    itemId, 
                    RequestVehicleStatus.DEVUELTO,
                    {
                        odometer_in: parseFloat(itemData[key]?.odometer_in),
                        fuel_level_in: parseFloat(itemData[key]?.fuel_level_in),
                        return_notes: itemData[key]?.return_notes
                    }
                );
            } else if (type === 'epp') {
                await integratedRequestService.updateEPPStatus(
                    request.id, 
                    itemId, 
                    RequestEPPStatus.DEVUELTO,
                    {
                        is_disposed: itemData[key]?.is_disposed || false
                    }
                );
            } else if (type === 'product') {
                const item = request.items.find(i => i.id === itemId);
                await integratedRequestService.updateItemStatus(
                    request.id, 
                    itemId, 
                    RequestItemStatus.DEVUELTO_PARCIAL,
                    {
                        quantity_returned: item?.quantity_returned, // Already set by operator, but confirming
                        warehouse_id: itemData[key]?.warehouse_id, // Required for stock IN
                        location_id: itemData[key]?.location_id // Required for stock IN
                    }
                );
            }
            
            Alert.alert('Success', 'Item returned successfully');
            fetchRequest(); // Refresh
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to confirm return');
        } finally {
            setProcessingItems(prev => ({ ...prev, [key]: false }));
        }
    };

    if (loading || !request) {
        return <View style={styles.container}><Text>Loading...</Text></View>;
    }

    return (
        <View style={styles.container}>
            <Topbar title={`Procesar Devolución #${request.request_number}`} onBack={() => router.back()} />
            <ScrollView style={styles.content}>
                
                {/* Tools */}
                {request.tools.filter(t => t.status === RequestToolStatus.EN_DEVOLUCION).map(tool => {
                    const key = `tool_${tool.id}`;
                    return (
                        <View key={key} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{tool.tool?.name}</Text>
                                <View style={styles.badge}><Text style={styles.badgeText}>HERRAMIENTA</Text></View>
                            </View>
                            <Text style={styles.info}>Condición Reportada: {tool.condition_in}</Text>
                            
                            <TouchableOpacity 
                                style={styles.actionButton} 
                                onPress={() => handleConfirmReturn('tool', tool.id)}
                                disabled={processingItems[key]}
                            >
                                <Text style={styles.actionButtonText}>Confirmar Recepción</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* Vehicles */}
                {request.vehicles.filter(v => v.status === RequestVehicleStatus.EN_DEVOLUCION).map(vehicle => {
                    const key = `vehicle_${vehicle.id}`;
                    return (
                        <View key={key} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{vehicle.vehicle?.brand} {vehicle.vehicle?.model}</Text>
                                <View style={[styles.badge, {backgroundColor: '#17a2b8'}]}><Text style={styles.badgeText}>VEHÍCULO</Text></View>
                            </View>
                            <Text style={styles.info}>Odómetro Reportado: {vehicle.odometer_in}</Text>
                            <Text style={styles.info}>Combustible Reportado: {vehicle.fuel_level_in}%</Text>
                            <Text style={styles.info}>Notas: {vehicle.return_notes}</Text>
                            
                            <TouchableOpacity 
                                style={styles.actionButton} 
                                onPress={() => handleConfirmReturn('vehicle', vehicle.id)}
                                disabled={processingItems[key]}
                            >
                                <Text style={styles.actionButtonText}>Confirmar Recepción</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* EPP */}
                {request.epp_items.filter(e => e.status === RequestEPPStatus.EN_DEVOLUCION).map(epp => {
                    const key = `epp_${epp.id}`;
                    return (
                        <View key={key} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{epp.epp?.name}</Text>
                                <View style={[styles.badge, {backgroundColor: '#28a745'}]}><Text style={styles.badgeText}>EPP</Text></View>
                            </View>
                            <Text style={styles.info}>Condición Reportada: {epp.condition_in}</Text>
                            
                            <View style={styles.switchRow}>
                                <Text>Desechar (Marcar como Disposed)</Text>
                                <Switch 
                                    value={itemData[key]?.is_disposed || false}
                                    onValueChange={(v) => updateItemData(key, 'is_disposed', v)}
                                />
                            </View>

                            <TouchableOpacity 
                                style={styles.actionButton} 
                                onPress={() => handleConfirmReturn('epp', epp.id)}
                                disabled={processingItems[key]}
                            >
                                <Text style={styles.actionButtonText}>Confirmar Recepción</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* Products */}
                {request.items.filter(i => i.status === RequestItemStatus.EN_DEVOLUCION).map(item => {
                    const key = `product_${item.id}`;
                    return (
                        <View key={key} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.product?.name}</Text>
                                <View style={[styles.badge, {backgroundColor: '#6c757d'}]}><Text style={styles.badgeText}>PRODUCTO</Text></View>
                            </View>
                            <Text style={styles.info}>Cantidad Devuelta: {item.quantity_returned}</Text>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Warehouse ID (para reingreso):</Text>
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric"
                                    placeholder="ID de Almacén"
                                    value={itemData[key]?.warehouse_id}
                                    onChangeText={(t) => updateItemData(key, 'warehouse_id', t)}
                                />
                            </View>

                            <TouchableOpacity 
                                style={styles.actionButton} 
                                onPress={() => handleConfirmReturn('product', item.id)}
                                disabled={processingItems[key]}
                            >
                                <Text style={styles.actionButtonText}>Confirmar Recepción</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                {/* Empty State */}
                {(!request.tools.some(t => t.status === RequestToolStatus.EN_DEVOLUCION) &&
                  !request.vehicles.some(v => v.status === RequestVehicleStatus.EN_DEVOLUCION) &&
                  !request.epp_items.some(e => e.status === RequestEPPStatus.EN_DEVOLUCION) &&
                  !request.items.some(i => i.status === RequestItemStatus.EN_DEVOLUCION)) && (
                    <Text style={styles.emptyText}>No hay items pendientes de recepción en esta solicitud.</Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    content: { padding: 15 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    badge: { backgroundColor: '#ffc107', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: 'white' },
    info: { fontSize: 14, color: '#555', marginBottom: 5 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
    actionButton: { backgroundColor: '#007bff', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 10 },
    actionButtonText: { color: 'white', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 30, color: '#666' },
    inputGroup: { marginTop: 10 },
    label: { fontSize: 12, color: '#666', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, padding: 8, backgroundColor: '#f9f9f9' }
});
