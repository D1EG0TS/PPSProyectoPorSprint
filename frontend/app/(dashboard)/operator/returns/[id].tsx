import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Topbar } from '../../../../components/Topbar';
import { integratedRequestService } from '../../../../services/integratedRequestService';
import { IntegratedRequest, RequestToolStatus, RequestVehicleStatus, RequestEPPStatus, RequestItemStatus } from '../../../../types/integratedRequest';
import { Ionicons } from '@expo/vector-icons';

export default function ReturnRequestItemsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [request, setRequest] = useState<IntegratedRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
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

    const toggleSelection = (key: string) => {
        setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }));
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

    const handleSubmit = async () => {
        if (!request) return;
        
        const promises: Promise<any>[] = [];
        
        // Process Tools
        request.tools.forEach(tool => {
            const key = `tool_${tool.id}`;
            if (selectedItems[key]) {
                const data = {
                    condition_in: itemData[key]?.condition_in || 'BUENO'
                };
                promises.push(
                    integratedRequestService.updateToolStatus(
                        request.id, 
                        tool.id, 
                        RequestToolStatus.EN_DEVOLUCION, 
                        data
                    )
                );
            }
        });

        // Process Vehicles
        request.vehicles.forEach(vehicle => {
            const key = `vehicle_${vehicle.id}`;
            if (selectedItems[key]) {
                const data = {
                    odometer_in: parseFloat(itemData[key]?.odometer_in || '0'),
                    fuel_level_in: parseFloat(itemData[key]?.fuel_level_in || '0'),
                    return_notes: itemData[key]?.return_notes || ''
                };
                promises.push(
                    integratedRequestService.updateVehicleStatus(
                        request.id, 
                        vehicle.id, 
                        RequestVehicleStatus.EN_DEVOLUCION, 
                        data
                    )
                );
            }
        });

        // Process EPP
        request.epp_items.forEach(epp => {
            const key = `epp_${epp.id}`;
            if (selectedItems[key]) {
                const data = {
                    condition_in: itemData[key]?.condition_in || 'BUENO'
                };
                promises.push(
                    integratedRequestService.updateEPPStatus(
                        request.id, 
                        epp.id, 
                        RequestEPPStatus.EN_DEVOLUCION, 
                        data
                    )
                );
            }
        });

        // Process Products (Partial Return)
        request.items.forEach(item => {
            const key = `product_${item.id}`;
            if (selectedItems[key]) {
                const data = {
                    quantity_returned: parseFloat(itemData[key]?.quantity_returned || '0')
                };
                promises.push(
                    integratedRequestService.updateItemStatus(
                        request.id, 
                        item.id, 
                        RequestItemStatus.EN_DEVOLUCION, 
                        data
                    )
                );
            }
        });

        try {
            await Promise.all(promises);
            Alert.alert('Success', 'Items marked for return');
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to process returns');
        }
    };

    if (loading || !request) {
        return <View style={styles.container}><Text>Loading...</Text></View>;
    }

    return (
        <View style={styles.container}>
            <Topbar title="Devolución de Items" onBack={() => router.back()} />
            <ScrollView style={styles.content}>
                
                {/* Tools */}
                {request.tools.filter(t => t.status === RequestToolStatus.PRESTADA).length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Herramientas</Text>
                        {request.tools.filter(t => t.status === RequestToolStatus.PRESTADA).map(tool => {
                            const key = `tool_${tool.id}`;
                            const isSelected = selectedItems[key];
                            return (
                                <View key={key} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>{tool.tool?.name}</Text>
                                        <Switch value={isSelected} onValueChange={() => toggleSelection(key)} />
                                    </View>
                                    {isSelected && (
                                        <View style={styles.inputs}>
                                            <Text style={styles.label}>Condición:</Text>
                                            <TextInput 
                                                style={styles.input} 
                                                value={itemData[key]?.condition_in || 'BUENO'}
                                                onChangeText={(t) => updateItemData(key, 'condition_in', t)}
                                            />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Vehicles */}
                {request.vehicles.filter(v => v.status === RequestVehicleStatus.EN_USO).length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Vehículos</Text>
                        {request.vehicles.filter(v => v.status === RequestVehicleStatus.EN_USO).map(vehicle => {
                            const key = `vehicle_${vehicle.id}`;
                            const isSelected = selectedItems[key];
                            return (
                                <View key={key} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>{vehicle.vehicle?.brand} {vehicle.vehicle?.model} ({vehicle.vehicle?.plate})</Text>
                                        <Switch value={isSelected} onValueChange={() => toggleSelection(key)} />
                                    </View>
                                    {isSelected && (
                                        <View style={styles.inputs}>
                                            <Text style={styles.label}>Odómetro Entrada:</Text>
                                            <TextInput 
                                                style={styles.input} 
                                                keyboardType="numeric"
                                                placeholder="0"
                                                value={itemData[key]?.odometer_in}
                                                onChangeText={(t) => updateItemData(key, 'odometer_in', t)}
                                            />
                                            <Text style={styles.label}>Combustible (%):</Text>
                                            <TextInput 
                                                style={styles.input} 
                                                keyboardType="numeric"
                                                placeholder="0-100"
                                                value={itemData[key]?.fuel_level_in}
                                                onChangeText={(t) => updateItemData(key, 'fuel_level_in', t)}
                                            />
                                            <Text style={styles.label}>Notas:</Text>
                                            <TextInput 
                                                style={styles.input} 
                                                value={itemData[key]?.return_notes}
                                                onChangeText={(t) => updateItemData(key, 'return_notes', t)}
                                            />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* EPP */}
                {request.epp_items.filter(e => e.status === RequestEPPStatus.ENTREGADO || e.status === RequestEPPStatus.ASIGNADO).length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>EPP (Equipos de Protección)</Text>
                        {request.epp_items.filter(e => e.status === RequestEPPStatus.ENTREGADO || e.status === RequestEPPStatus.ASIGNADO).map(epp => {
                            const key = `epp_${epp.id}`;
                            const isSelected = selectedItems[key];
                            return (
                                <View key={key} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>{epp.epp?.name}</Text>
                                        <Switch value={isSelected} onValueChange={() => toggleSelection(key)} />
                                    </View>
                                    {isSelected && (
                                        <View style={styles.inputs}>
                                            <Text style={styles.label}>Condición:</Text>
                                            <TextInput 
                                                style={styles.input} 
                                                value={itemData[key]?.condition_in || 'BUENO'}
                                                onChangeText={(t) => updateItemData(key, 'condition_in', t)}
                                            />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Products */}
                {request.items.filter(i => i.status === RequestItemStatus.ENTREGADO).length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Productos (Sobrantes)</Text>
                        {request.items.filter(i => i.status === RequestItemStatus.ENTREGADO).map(item => {
                            const key = `product_${item.id}`;
                            const isSelected = selectedItems[key];
                            return (
                                <View key={key} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>{item.product?.name}</Text>
                                        <Switch value={isSelected} onValueChange={() => toggleSelection(key)} />
                                    </View>
                                    {isSelected && (
                                        <View style={styles.inputs}>
                                            <Text style={styles.label}>Cantidad a devolver (Max {item.quantity_delivered}):</Text>
                                            <TextInput 
                                                style={styles.input} 
                                                keyboardType="numeric"
                                                value={itemData[key]?.quantity_returned}
                                                onChangeText={(t) => updateItemData(key, 'quantity_returned', t)}
                                            />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>Confirmar Devolución</Text>
                </TouchableOpacity>
                <View style={{height: 40}} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    content: { padding: 15 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '600' },
    inputs: { marginTop: 10, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 5 },
    label: { fontSize: 14, color: '#666', marginBottom: 5, marginTop: 5 },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 8 },
    submitButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
