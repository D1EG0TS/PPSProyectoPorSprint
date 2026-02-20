import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Topbar } from '../../../../components/Topbar';
import { IntegratedRequestPurpose, EmergencyLevel, IntegratedRequestCreate, RequestItemCreate, RequestToolCreate, RequestEPPCreate, RequestVehicleCreate } from '../../../../types/integratedRequest';
import { integratedRequestService } from '../../../../services/integratedRequestService';
import { ItemSelector } from '../../../../components/integrated-requests/ItemSelector';
import { AssignmentSelector } from '../../../../components/integrated-requests/AssignmentSelector';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

type Section = 'GENERAL' | 'PRODUCTS' | 'TOOLS' | 'EPP' | 'VEHICLES' | 'REVIEW';

export default function NewIntegratedRequestScreen() {
    const router = useRouter();
    const [currentSection, setCurrentSection] = useState<Section>('GENERAL');
    const [submitting, setSubmitting] = useState(false);

    // Form Data
    const [purpose, setPurpose] = useState<IntegratedRequestPurpose>(IntegratedRequestPurpose.MANTENIMIENTO);
    const [projectCode, setProjectCode] = useState('');
    const [emergencyLevel, setEmergencyLevel] = useState<EmergencyLevel>(EmergencyLevel.NORMAL);
    const [expectedReturnDate, setExpectedReturnDate] = useState<Date | undefined>(undefined);
    const [notes, setNotes] = useState('');

    // Items
    const [products, setProducts] = useState<RequestItemCreate[]>([]);
    const [tools, setTools] = useState<RequestToolCreate[]>([]);
    const [epps, setEpps] = useState<RequestEPPCreate[]>([]);
    const [vehicles, setVehicles] = useState<RequestVehicleCreate[]>([]);

    // UI State
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleCreate = async () => {
        if (!purpose) {
            Alert.alert('Error', 'Please select a purpose');
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create the Request Header
            const requestData: IntegratedRequestCreate = {
                purpose,
                project_code: projectCode,
                emergency_level: emergencyLevel,
                expected_return_date: expectedReturnDate?.toISOString().split('T')[0],
                notes
            };

            const createdRequest = await integratedRequestService.create(requestData);
            const requestId = createdRequest.id;

            // 2. Add Items
            // In a real app, we might want to batch these or have a bulk endpoint.
            // For now, loop and add.
            for (const p of products) {
                await integratedRequestService.addItem(requestId, p);
            }
            for (const t of tools) {
                await integratedRequestService.addTool(requestId, t);
            }
            for (const e of epps) {
                await integratedRequestService.addEPP(requestId, e);
            }
            for (const v of vehicles) {
                await integratedRequestService.addVehicle(requestId, v);
            }

            // 3. Submit (if desired, or leave as draft)
            // The requirement says: borrador -> pendiente.
            // Let's ask user if they want to submit immediately or save as draft.
            Alert.alert(
                'Success',
                'Request created successfully.',
                [
                    { text: 'Save as Draft', onPress: () => router.push('/(dashboard)/operator/requests/integrated') },
                    { 
                        text: 'Submit Now', 
                        onPress: async () => {
                            await integratedRequestService.submit(requestId);
                            router.push('/(dashboard)/operator/requests/integrated');
                        }
                    }
                ]
            );

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create request');
        } finally {
            setSubmitting(false);
        }
    };

    const addProduct = (product: any, quantity: number = 1) => {
        setProducts([...products, { product_id: product.id, quantity_requested: quantity, name: product.name } as any]);
        Alert.alert('Added', `${product.name} (Qty: ${quantity})`);
    };

    const addTool = (tool: any) => {
        setTools([...tools, { tool_id: tool.id, name: tool.name } as any]);
        Alert.alert('Added', `${tool.name}`);
    };

    const addEPP = (epp: any) => {
        setEpps([...epps, { epp_id: epp.id, name: epp.name } as any]);
        Alert.alert('Added', `${epp.name}`);
    };

    const addVehicle = (vehicle: any) => {
        setVehicles([...vehicles, { vehicle_id: vehicle.id, name: `${vehicle.brand} ${vehicle.model}` } as any]);
        Alert.alert('Added', `${vehicle.brand} ${vehicle.model}`);
    };

    const renderGeneralSection = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>General Information</Text>
            
            <Text style={styles.label}>Purpose</Text>
            <View style={styles.pickerContainer}>
                {Object.values(IntegratedRequestPurpose).map((p) => (
                    <TouchableOpacity 
                        key={p} 
                        style={[styles.chip, purpose === p && styles.chipSelected]}
                        onPress={() => setPurpose(p)}
                    >
                        <Text style={[styles.chipText, purpose === p && styles.chipTextSelected]}>{p}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Emergency Level</Text>
            <View style={styles.pickerContainer}>
                {Object.values(EmergencyLevel).map((l) => (
                    <TouchableOpacity 
                        key={l} 
                        style={[styles.chip, emergencyLevel === l && styles.chipSelected]}
                        onPress={() => setEmergencyLevel(l)}
                    >
                        <Text style={[styles.chipText, emergencyLevel === l && styles.chipTextSelected]}>{l}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Project Code (Optional)</Text>
            <TextInput 
                style={styles.input} 
                value={projectCode} 
                onChangeText={setProjectCode} 
                placeholder="e.g. PRJ-2023-001"
            />

            <Text style={styles.label}>Expected Return Date (Optional)</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text>{expectedReturnDate ? expectedReturnDate.toDateString() : 'Select Date'}</Text>
                <Ionicons name="calendar" size={20} color="#666" />
            </TouchableOpacity>
            {showDatePicker && (
                <DateTimePicker
                    value={expectedReturnDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event: any, selectedDate?: Date) => {
                        setShowDatePicker(false);
                        if (selectedDate) setExpectedReturnDate(selectedDate);
                    }}
                />
            )}

            <Text style={styles.label}>Notes</Text>
            <TextInput 
                style={[styles.input, styles.textArea]} 
                value={notes} 
                onChangeText={setNotes} 
                multiline 
                numberOfLines={3}
            />
        </View>
    );

    const renderReviewSection = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review Items</Text>
            
            <Text style={styles.subTitle}>Products ({products.length})</Text>
            {products.map((p, i) => (
                <View key={i} style={styles.reviewItem}>
                    <Text>{(p as any).name}</Text>
                    <Text>Qty: {p.quantity_requested}</Text>
                </View>
            ))}

            <Text style={styles.subTitle}>Tools ({tools.length})</Text>
            {tools.map((t, i) => (
                <View key={i} style={styles.reviewItem}>
                    <Text>{(t as any).name}</Text>
                </View>
            ))}

            <Text style={styles.subTitle}>EPP ({epps.length})</Text>
            {epps.map((e, i) => (
                <View key={i} style={styles.reviewItem}>
                    <Text>{(e as any).name}</Text>
                </View>
            ))}

            <Text style={styles.subTitle}>Vehicles ({vehicles.length})</Text>
            {vehicles.map((v, i) => (
                <View key={i} style={styles.reviewItem}>
                    <Text>{(v as any).name}</Text>
                </View>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            <Topbar title="New Integrated Request" />
            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, currentSection === 'GENERAL' && styles.tabActive]} onPress={() => setCurrentSection('GENERAL')}>
                    <Text style={styles.tabText}>General</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, currentSection === 'PRODUCTS' && styles.tabActive]} onPress={() => setCurrentSection('PRODUCTS')}>
                    <Text style={styles.tabText}>Products</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, currentSection === 'TOOLS' && styles.tabActive]} onPress={() => setCurrentSection('TOOLS')}>
                    <Text style={styles.tabText}>Tools</Text>
                </TouchableOpacity>
                {/* Simplified tabs for brevity */}
                <TouchableOpacity style={[styles.tab, currentSection === 'REVIEW' && styles.tabActive]} onPress={() => setCurrentSection('REVIEW')}>
                    <Text style={styles.tabText}>Review</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {currentSection === 'GENERAL' && renderGeneralSection()}
                
                {currentSection === 'PRODUCTS' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Add Products</Text>
                        <ItemSelector type="PRODUCT" onSelect={addProduct} />
                    </View>
                )}

                {currentSection === 'TOOLS' && (
                    <View style={styles.section}>
                         <View style={styles.tabSubHeader}>
                            <TouchableOpacity onPress={() => setCurrentSection('TOOLS')}><Text style={{fontWeight: 'bold'}}>Tools</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentSection('EPP')}><Text>EPP</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentSection('VEHICLES')}><Text>Vehicles</Text></TouchableOpacity>
                        </View>
                        <Text style={styles.sectionTitle}>Add Tools</Text>
                        <ItemSelector type="TOOL" onSelect={addTool} />
                    </View>
                )}

                {currentSection === 'EPP' && (
                    <View style={styles.section}>
                         <View style={styles.tabSubHeader}>
                            <TouchableOpacity onPress={() => setCurrentSection('TOOLS')}><Text>Tools</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentSection('EPP')}><Text style={{fontWeight: 'bold'}}>EPP</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentSection('VEHICLES')}><Text>Vehicles</Text></TouchableOpacity>
                        </View>
                        <Text style={styles.sectionTitle}>Add EPP</Text>
                        <ItemSelector type="EPP" onSelect={addEPP} />
                    </View>
                )}

                 {currentSection === 'VEHICLES' && (
                    <View style={styles.section}>
                         <View style={styles.tabSubHeader}>
                            <TouchableOpacity onPress={() => setCurrentSection('TOOLS')}><Text>Tools</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentSection('EPP')}><Text>EPP</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentSection('VEHICLES')}><Text style={{fontWeight: 'bold'}}>Vehicles</Text></TouchableOpacity>
                        </View>
                        <Text style={styles.sectionTitle}>Add Vehicles</Text>
                        <ItemSelector type="VEHICLE" onSelect={addVehicle} />
                    </View>
                )}

                {currentSection === 'REVIEW' && renderReviewSection()}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.submitButton} onPress={handleCreate} disabled={submitting}>
                    {submitting ? <Text style={styles.submitButtonText}>Creating...</Text> : <Text style={styles.submitButtonText}>Create Request</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    tab: {
        flex: 1,
        padding: 15,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#007bff',
    },
    tabText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#f9f9f9',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#eee',
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    chipSelected: {
        backgroundColor: '#007bff',
    },
    chipText: {
        color: '#333',
    },
    chipTextSelected: {
        color: 'white',
        fontWeight: 'bold',
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#f9f9f9',
    },
    footer: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    submitButton: {
        backgroundColor: '#28a745',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    subTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 5,
        color: '#555',
    },
    reviewItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tabSubHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    }
});
