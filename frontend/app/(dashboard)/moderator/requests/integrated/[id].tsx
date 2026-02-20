import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { Topbar } from '../../../../../components/Topbar';
import { integratedRequestService } from '../../../../../services/integratedRequestService';
import { warehouseService, Warehouse } from '../../../../../services/warehouseService';
import { IntegratedRequest, IntegratedRequestStatus, RequestItemStatus, RequestToolStatus, RequestVehicleStatus, RequestEPPStatus, FuelLevel } from '../../../../../types/integratedRequest';
import { StorageLocation } from '../../../../../types/location';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { AssignmentSelector } from '../../../../../components/integrated-requests/AssignmentSelector';
import { User } from '../../../../../services/userService';

export default function ModeratorRequestDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [request, setRequest] = useState<IntegratedRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Assignment Modal State
    const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
    const [selectedItemForAssignment, setSelectedItemForAssignment] = useState<{id: number, type: 'PRODUCT' | 'TOOL' | 'EPP' | 'VEHICLE'} | null>(null);
    const [actionType, setActionType] = useState<'DELIVER' | 'RETURN'>('DELIVER');
    const [assignee, setAssignee] = useState<User | null>(null);
    
    // Product Delivery/Return specific
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<StorageLocation[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
    const [deliveryQuantity, setDeliveryQuantity] = useState('');
    const [returnQuantity, setReturnQuantity] = useState('');

    // Tool Return specific
    const [toolCondition, setToolCondition] = useState('');

    // EPP Return specific
    const [eppCondition, setEppCondition] = useState('');
    const [eppDisposed, setEppDisposed] = useState(false);

    // Vehicle Return specific
    const [vehicleOdometer, setVehicleOdometer] = useState('');
    const [vehicleFuelLevel, setVehicleFuelLevel] = useState('75-100%');
    const [vehicleReturnNotes, setVehicleReturnNotes] = useState('');

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
        loadWarehouses();
    }, [id]);

    const loadWarehouses = async () => {
        try {
            const data = await warehouseService.getWarehouses();
            setWarehouses(data);
        } catch (error) {
            console.error('Failed to load warehouses', error);
        }
    };

    useEffect(() => {
        if (selectedWarehouseId) {
            loadLocations(selectedWarehouseId);
        } else {
            setLocations([]);
        }
    }, [selectedWarehouseId]);

    const loadLocations = async (warehouseId: number) => {
        try {
            const data = await warehouseService.getLocations(warehouseId);
            setLocations(data);
        } catch (error) {
            console.error('Failed to load locations', error);
        }
    };

    const handleApprove = async () => {
        if (!request) return;
        try {
            await integratedRequestService.approve(request.id);
            Alert.alert('Success', 'Request approved');
            fetchRequest();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to approve request');
        }
    };

    const handleReject = async () => {
        if (!request) return;
        try {
            await integratedRequestService.reject(request.id, rejectReason);
            setRejectModalVisible(false);
            Alert.alert('Success', 'Request rejected');
            fetchRequest();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to reject request');
        }
    };

    const handleItemAction = (itemId: number, type: 'PRODUCT' | 'TOOL' | 'EPP' | 'VEHICLE', action: 'DELIVER' | 'RETURN', quantity?: number) => {
        setSelectedItemForAssignment({ id: itemId, type });
        setActionType(action);
        setAssignmentModalVisible(true);
        setAssignee(null);
        
        if (type === 'PRODUCT') {
            if (action === 'DELIVER') {
                setDeliveryQuantity(quantity ? quantity.toString() : '');
                setSelectedWarehouseId(null);
                setSelectedLocationId(null);
            } else {
                setReturnQuantity('');
                setSelectedWarehouseId(null);
                setSelectedLocationId(null);
            }
        } else if (type === 'TOOL' && action === 'RETURN') {
            setToolCondition('');
        } else if (type === 'EPP' && action === 'RETURN') {
            setEppCondition('');
            setEppDisposed(false);
        } else if (type === 'VEHICLE' && action === 'RETURN') {
            setVehicleOdometer('');
            setVehicleFuelLevel('75-100%');
            setVehicleReturnNotes('');
        }
    };

    const handleConfirmAssignment = async () => {
        if (!request || !selectedItemForAssignment) return;

        try {
            const { id, type } = selectedItemForAssignment;
            const assignedTo = assignee ? assignee.id : request.requested_by; // Default to requester if not specified

            if (type === 'PRODUCT') {
                if (!selectedWarehouseId) {
                    Alert.alert('Error', 'Please select a source warehouse');
                    return;
                }
                const quantity = parseInt(deliveryQuantity);
                if (isNaN(quantity) || quantity <= 0) {
                    Alert.alert('Error', 'Please enter a valid quantity');
                    return;
                }

                await integratedRequestService.updateItemStatus(
                    request.id, 
                    id, 
                    RequestItemStatus.ENTREGADO, 
                    { 
                        quantity_delivered: quantity,
                        warehouse_id: selectedWarehouseId,
                        location_id: selectedLocationId
                    }
                );
            } else if (type === 'TOOL') {
                await integratedRequestService.updateToolStatus(request.id, id, RequestToolStatus.PRESTADA, { assigned_to: assignedTo });
            } else if (type === 'EPP') {
                await integratedRequestService.updateEPPStatus(request.id, id, RequestEPPStatus.ASIGNADO, { assigned_to: assignedTo });
            } else if (type === 'VEHICLE') {
                if (actionType === 'RETURN') {
                    let fuelEnum = FuelLevel.LEVEL_75_100;
                    if (vehicleFuelLevel === '0-25%') fuelEnum = FuelLevel.LEVEL_0_25;
                    if (vehicleFuelLevel === '25-50%') fuelEnum = FuelLevel.LEVEL_25_50;
                    if (vehicleFuelLevel === '50-75%') fuelEnum = FuelLevel.LEVEL_50_75;

                    await integratedRequestService.updateVehicleStatus(
                        request.id, 
                        id, 
                        RequestVehicleStatus.DEVUELTO, 
                        { 
                            odometer_in: parseInt(vehicleOdometer),
                            fuel_level_in: fuelEnum,
                            return_notes: vehicleReturnNotes
                        }
                    );
                } else {
                    await integratedRequestService.updateVehicleStatus(request.id, id, RequestVehicleStatus.EN_USO, { assigned_to: assignedTo });
                }
            }

            setAssignmentModalVisible(false);
            Alert.alert('Success', 'Item updated');
            fetchRequest();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update item');
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

    const renderStatusBadge = (status: string) => {
        let color = '#6c757d';
        if (status === 'APROBADA' || status === 'APROBADO' || status === 'ENTREGADA' || status === 'COMPLETADA' || status === 'ASIGNADO' || status === 'PRESTADA' || status === 'EN_USO') color = '#28a745';
        if (status === 'PENDIENTE') color = '#ffc107';
        if (status === 'RECHAZADA') color = '#dc3545';
        
        return (
            <View style={[styles.badge, { backgroundColor: color }]}>
                <Text style={styles.badgeText}>{status}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Topbar title={`Manage Request ${request.request_number}`} onBack={() => router.back()} />
            
            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Requested By:</Text>
                        <Text style={styles.value}>User #{request.requested_by}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Date:</Text>
                        <Text style={styles.value}>{format(new Date(request.created_at), 'yyyy-MM-dd HH:mm')}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Status:</Text>
                        {renderStatusBadge(request.status)}
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Purpose:</Text>
                        <Text style={styles.value}>{request.purpose}</Text>
                    </View>
                    {request.notes && (
                        <View style={styles.notesBox}>
                            <Text style={styles.notesText}>{request.notes}</Text>
                        </View>
                    )}

                    {request.status === IntegratedRequestStatus.PENDIENTE && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.approveButton} onPress={handleApprove}>
                                <Text style={styles.buttonText}>Approve Request</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.rejectButton} onPress={() => setRejectModalVisible(true)}>
                                <Text style={styles.buttonText}>Reject Request</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Products */}
                {request.items.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Products</Text>
                        {request.items.map((item, i) => (
                            <View key={i} style={styles.itemCard}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemName}>{item.product?.name || `Product #${item.product_id}`}</Text>
                                    {renderStatusBadge(item.status)}
                                </View>
                                <Text>Requested: {item.quantity_requested}</Text>
                                <Text>Approved: {item.quantity_approved}</Text>
                                
                                {request.status === IntegratedRequestStatus.APROBADA && item.status === RequestItemStatus.APROBADO && (
                                    <TouchableOpacity style={styles.actionLink} onPress={() => handleItemAction(item.id, 'PRODUCT', 'DELIVER', item.quantity_approved)}>
                                        <Text style={styles.actionLinkText}>Mark Delivered</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Tools */}
                {request.tools.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tools</Text>
                        {request.tools.map((tool, i) => (
                            <View key={i} style={styles.itemCard}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemName}>{tool.tool?.name || `Tool #${tool.tool_id}`}</Text>
                                    {renderStatusBadge(tool.status)}
                                </View>
                                {tool.assigned_to && <Text style={styles.itemDetail}>Assigned to: User #{tool.assigned_to}</Text>}
                                
                                {request.status === IntegratedRequestStatus.APROBADA && tool.status === RequestToolStatus.PENDIENTE && (
                                     <TouchableOpacity style={styles.actionLink} onPress={() => handleItemAction(tool.id, 'TOOL', 'DELIVER')}>
                                        <Text style={styles.actionLinkText}>Check Out / Assign</Text>
                                    </TouchableOpacity>
                                )}
                                {(tool.status === RequestToolStatus.PRESTADA || tool.status === RequestToolStatus.PENDIENTE) && request.status === IntegratedRequestStatus.APROBADA && tool.status !== RequestToolStatus.PENDIENTE && (
                                     <TouchableOpacity style={styles.actionLink} onPress={() => handleItemAction(tool.id, 'TOOL', 'RETURN')}>
                                        <Text style={styles.actionLinkText}>Register Return</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}
                
                {/* EPP */}
                {request.epp_items.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>EPP</Text>
                        {request.epp_items.map((epp, i) => (
                            <View key={i} style={styles.itemCard}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemName}>{epp.epp?.name || `EPP #${epp.epp_id}`}</Text>
                                    {renderStatusBadge(epp.status)}
                                </View>
                                {epp.assigned_to && <Text style={styles.itemDetail}>Assigned to: User #{epp.assigned_to}</Text>}
                                
                                {request.status === IntegratedRequestStatus.APROBADA && epp.status === RequestEPPStatus.PENDIENTE && (
                                     <TouchableOpacity style={styles.actionLink} onPress={() => handleItemAction(epp.id, 'EPP', 'DELIVER')}>
                                        <Text style={styles.actionLinkText}>Assign</Text>
                                    </TouchableOpacity>
                                )}
                                {(epp.status === RequestEPPStatus.ASIGNADO) && (
                                     <TouchableOpacity style={styles.actionLink} onPress={() => handleItemAction(epp.id, 'EPP', 'RETURN')}>
                                        <Text style={styles.actionLinkText}>Register Return</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                 {/* Vehicles */}
                 {request.vehicles.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Vehicles</Text>
                        {request.vehicles.map((vehicle, i) => (
                            <View key={i} style={styles.itemCard}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemName}>{vehicle.vehicle?.brand} {vehicle.vehicle?.model}</Text>
                                    {renderStatusBadge(vehicle.status)}
                                </View>
                                <Text>Plate: {vehicle.vehicle?.plate}</Text>
                                {vehicle.assigned_to && <Text style={styles.itemDetail}>Assigned to: User #{vehicle.assigned_to}</Text>}

                                {request.status === IntegratedRequestStatus.APROBADA && vehicle.status === RequestVehicleStatus.PENDIENTE && (
                                     <TouchableOpacity style={styles.actionLink} onPress={() => handleItemAction(vehicle.id, 'VEHICLE', 'DELIVER')}>
                                        <Text style={styles.actionLinkText}>Handover Keys</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

            </ScrollView>

            {/* Reject Modal */}
            <Modal visible={rejectModalVisible} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reject Request</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Reason for rejection"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectModalVisible(false)}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={handleReject}>
                                <Text style={styles.modalConfirmText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Assignment Modal */}
            <Modal visible={assignmentModalVisible} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {selectedItemForAssignment?.type === 'PRODUCT' ? 'Deliver Products' : 'Assign Item'}
                        </Text>
                        
                        <Text style={styles.modalSubtitle}>
                            Confirm assignment/delivery for this item.
                        </Text>

                        {selectedItemForAssignment?.type === 'PRODUCT' ? (
                            <View>
                                <Text style={styles.inputLabel}>Source Warehouse:</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={selectedWarehouseId}
                                        onValueChange={(itemValue) => setSelectedWarehouseId(itemValue)}
                                    >
                                        <Picker.Item label="Select Warehouse" value={null} />
                                        {warehouses.map(w => (
                                            <Picker.Item key={w.id} label={w.name} value={w.id} />
                                        ))}
                                    </Picker>
                                </View>

                                <Text style={styles.inputLabel}>Source Location (Optional):</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={selectedLocationId}
                                        onValueChange={(itemValue) => setSelectedLocationId(itemValue)}
                                        enabled={!!selectedWarehouseId}
                                    >
                                        <Picker.Item label="Select Location" value={null} />
                                        {locations.map(l => (
                                            <Picker.Item key={l.id} label={`${l.code} - ${l.name}`} value={l.id} />
                                        ))}
                                    </Picker>
                                </View>

                                <Text style={styles.inputLabel}>Quantity to Deliver:</Text>
                                <TextInput
                                    style={styles.input}
                                    value={deliveryQuantity}
                                    onChangeText={setDeliveryQuantity}
                                    keyboardType="numeric"
                                    placeholder="Quantity"
                                />
                            </View>
                        ) : (
                            actionType === 'DELIVER' ? (
                                <AssignmentSelector 
                                    onSelect={setAssignee} 
                                    label="Assign to (Optional - defaults to requester)"
                                />
                            ) : (
                                <View>
                                    {selectedItemForAssignment?.type === 'TOOL' && (
                                        <View>
                                            <Text style={styles.inputLabel}>Condition of Returned Tool:</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={toolCondition}
                                                onChangeText={setToolCondition}
                                                placeholder="e.g., GOOD, DAMAGED, LOST"
                                            />
                                        </View>
                                    )}

                                    {selectedItemForAssignment?.type === 'EPP' && (
                                        <View>
                                            <Text style={styles.inputLabel}>Return Condition:</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={eppCondition}
                                                onChangeText={setEppCondition}
                                                placeholder="e.g. Good, Worn, Damaged"
                                            />
                                            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
                                                <Switch
                                                    value={eppDisposed}
                                                    onValueChange={setEppDisposed}
                                                />
                                                <Text style={{marginLeft: 10}}>Disposed / Consumed (Not returned to stock)</Text>
                                            </View>
                                        </View>
                                    )}
                                    
                                    {selectedItemForAssignment?.type === 'VEHICLE' && (
                                        <View>
                                            <Text style={styles.inputLabel}>Current Odometer (km):</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={vehicleOdometer}
                                                onChangeText={setVehicleOdometer}
                                                keyboardType="numeric"
                                                placeholder="e.g. 50123"
                                            />
                                            
                                            <Text style={styles.inputLabel}>Fuel Level:</Text>
                                            <View style={styles.pickerContainer}>
                                                <Picker
                                                    selectedValue={vehicleFuelLevel}
                                                    onValueChange={(itemValue) => setVehicleFuelLevel(itemValue)}
                                                >
                                                    <Picker.Item label="75-100% (Full)" value="75-100%" />
                                                    <Picker.Item label="50-75% (3/4)" value="50-75%" />
                                                    <Picker.Item label="25-50% (1/2)" value="25-50%" />
                                                    <Picker.Item label="0-25% (Empty)" value="0-25%" />
                                                </Picker>
                                            </View>

                                            <Text style={styles.inputLabel}>Return Notes:</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={vehicleReturnNotes}
                                                onChangeText={setVehicleReturnNotes}
                                                placeholder="Any damage or issues..."
                                                multiline
                                            />
                                        </View>
                                    )}

                                    <Text style={styles.confirmText}>
                                        Are you sure you want to register the return of this item?
                                    </Text>
                                </View>
                            )
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setAssignmentModalVisible(false)}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: '#007bff' }]} onPress={handleConfirmAssignment}>
                                <Text style={styles.modalConfirmText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    label: {
        fontWeight: 'bold',
        color: '#555',
    },
    value: {
        color: '#333',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    notesBox: {
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderRadius: 4,
        marginTop: 10,
    },
    notesText: {
        fontStyle: 'italic',
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    approveButton: {
        backgroundColor: '#28a745',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    rejectButton: {
        backgroundColor: '#dc3545',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        borderRadius: 4,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    inputLabel: {
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#555',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    helperText: {
        fontSize: 12,
        color: '#777',
        fontStyle: 'italic',
        marginBottom: 10,
    },
    confirmText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    itemCard: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        elevation: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    itemName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    itemDetail: {
        fontSize: 12,
        color: '#666',
    },
    actionLink: {
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    actionLinkText: {
        color: '#007bff',
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    modalCancel: {
        padding: 10,
        marginRight: 10,
    },
    modalConfirm: {
        backgroundColor: '#dc3545',
        padding: 10,
        borderRadius: 8,
    },
    modalConfirmText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
