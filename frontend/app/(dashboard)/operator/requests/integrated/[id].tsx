import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Topbar } from '../../../../../components/Topbar';
import { integratedRequestService } from '../../../../../services/integratedRequestService';
import { IntegratedRequest, IntegratedRequestStatus } from '../../../../../types/integratedRequest';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function IntegratedRequestDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [request, setRequest] = useState<IntegratedRequest | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRequest = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await integratedRequestService.getById(Number(id));
            setRequest(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load request details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequest();
    }, [id]);

    const handleSubmit = async () => {
        if (!request) return;
        try {
            await integratedRequestService.submit(request.id);
            Alert.alert('Success', 'Request submitted successfully');
            fetchRequest();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to submit request');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    if (!request) {
        return (
            <View style={styles.container}>
                <Text>Request not found</Text>
            </View>
        );
    }

    const renderItemStatus = (status: string) => (
        <View style={[styles.itemStatusBadge, { backgroundColor: status === 'APROBADO' ? '#28a745' : '#6c757d' }]}>
            <Text style={styles.itemStatusText}>{status}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Topbar title={`Request ${request.request_number}`} onBack={() => router.back()} />
            
            <ScrollView style={styles.content}>
                {/* Header Info */}
                <View style={styles.section}>
                    <View style={styles.headerRow}>
                        <Text style={styles.statusLabel}>Status: <Text style={styles.statusValue}>{request.status}</Text></Text>
                        <Text style={styles.dateLabel}>{format(new Date(request.created_at), 'yyyy-MM-dd HH:mm')}</Text>
                    </View>
                    <Text style={styles.label}>Purpose: <Text style={styles.value}>{request.purpose}</Text></Text>
                    <Text style={styles.label}>Emergency Level: <Text style={styles.value}>{request.emergency_level}</Text></Text>
                    {request.project_code && <Text style={styles.label}>Project: <Text style={styles.value}>{request.project_code}</Text></Text>}
                    {request.notes && <Text style={styles.notes}>{request.notes}</Text>}

                    {request.status === IntegratedRequestStatus.BORRADOR && (
                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                            <Text style={styles.submitButtonText}>Submit Request</Text>
                        </TouchableOpacity>
                    )}

                    {(request.status !== IntegratedRequestStatus.BORRADOR && 
                      request.status !== IntegratedRequestStatus.PENDIENTE && 
                      request.status !== IntegratedRequestStatus.RECHAZADA) && (
                        <TouchableOpacity 
                            style={[styles.submitButton, { backgroundColor: '#ffc107', marginTop: 10 }]} 
                            onPress={() => router.push(`/(dashboard)/operator/returns/${request.id}`)}
                        >
                            <Text style={[styles.submitButtonText, { color: 'black' }]}>Devolver Items</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Items */}
                {request.items.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Products</Text>
                        {request.items.map((item, index) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{item.product?.name || `Product #${item.product_id}`}</Text>
                                    <Text style={styles.itemDetail}>Qty: {item.quantity_requested}</Text>
                                </View>
                                {renderItemStatus(item.status)}
                            </View>
                        ))}
                    </View>
                )}

                {/* Tools */}
                {request.tools.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tools</Text>
                        {request.tools.map((tool, index) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{tool.tool?.name || `Tool #${tool.tool_id}`}</Text>
                                    <Text style={styles.itemDetail}>Condition: {tool.condition_out || 'N/A'}</Text>
                                </View>
                                {renderItemStatus(tool.status)}
                            </View>
                        ))}
                    </View>
                )}

                {/* EPP */}
                {request.epp_items.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>EPP</Text>
                        {request.epp_items.map((epp, index) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{epp.epp?.name || `EPP #${epp.epp_id}`}</Text>
                                </View>
                                {renderItemStatus(epp.status)}
                            </View>
                        ))}
                    </View>
                )}

                 {/* Vehicles */}
                 {request.vehicles.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Vehicles</Text>
                        {request.vehicles.map((vehicle, index) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{vehicle.vehicle?.brand} {vehicle.vehicle?.model}</Text>
                                    <Text style={styles.itemDetail}>Plate: {vehicle.vehicle?.plate}</Text>
                                </View>
                                {renderItemStatus(vehicle.status)}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 15,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    statusLabel: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    statusValue: {
        color: '#007bff',
    },
    dateLabel: {
        color: '#999',
        fontSize: 12,
    },
    label: {
        fontSize: 14,
        marginBottom: 5,
        color: '#666',
    },
    value: {
        color: '#333',
        fontWeight: '500',
    },
    notes: {
        marginTop: 10,
        fontStyle: 'italic',
        color: '#666',
        backgroundColor: '#f9f9f9',
        padding: 8,
        borderRadius: 4,
    },
    submitButton: {
        backgroundColor: '#28a745',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
    },
    submitButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontWeight: '500',
        color: '#333',
    },
    itemDetail: {
        fontSize: 12,
        color: '#999',
    },
    itemStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 10,
    },
    itemStatusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
