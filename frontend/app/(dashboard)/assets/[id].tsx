import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Topbar } from '../../../components/Topbar';
import { DynamicAttributeForm } from '../../../components/assets/DynamicAttributeForm';
import { assetService } from '../../../services/assetService';
import { Asset, AssetType, AssetAttributeCreate, AttributeType } from '../../../types/assets';

// Simplified Tab Component
const TabButton = ({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity 
        style={[styles.tabButton, active && styles.activeTabButton]} 
        onPress={onPress}
    >
        <Text style={[styles.tabText, active && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
);

export default function AssetDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'assignments' | 'maintenance' | 'calibration'>('info');

    // Action Modals State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [showCalibrationModal, setShowCalibrationModal] = useState(false);

    // Form States
    const [assignUser, setAssignUser] = useState('');
    const [returnCondition, setReturnCondition] = useState('bueno');
    
    const fetchAsset = async () => {
        if (!id) return;
        try {
            const data = await assetService.getAsset(Number(id));
            setAsset(data);
        } catch (error) {
            console.error('Error fetching asset:', error);
            Alert.alert('Error', 'No se pudo cargar el activo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAsset();
    }, [id]);

    const handleAssign = async () => {
        if (!asset || !assignUser) return;
        try {
            await assetService.assignAsset(asset.id, { assigned_to: Number(assignUser) });
            Alert.alert('Éxito', 'Activo asignado correctamente');
            setShowAssignModal(false);
            fetchAsset();
        } catch (error) {
            Alert.alert('Error', 'No se pudo asignar el activo');
        }
    };

    const handleReturn = async () => {
        if (!asset) return;
        try {
            await assetService.returnAsset(asset.id, returnCondition);
            Alert.alert('Éxito', 'Activo devuelto correctamente');
            setShowReturnModal(false);
            fetchAsset();
        } catch (error) {
            Alert.alert('Error', 'No se pudo devolver el activo');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (!asset) {
        return (
            <View style={styles.container}>
                <Text>Activo no encontrado</Text>
            </View>
        );
    }

    const renderInfoTab = () => (
        <View>
            {/* General Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Información General</Text>
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>Marca</Text>
                        <Text style={styles.value}>{asset.brand || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>Modelo</Text>
                        <Text style={styles.value}>{asset.model || '-'}</Text>
                    </View>
                </View>
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>Serie</Text>
                        <Text style={styles.value}>{asset.serial_number || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>Ubicación</Text>
                        <Text style={styles.value}>ID: {asset.location_id || '-'}</Text>
                    </View>
                </View>
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>Costo Adq.</Text>
                        <Text style={styles.value}>${asset.acquisition_cost || 0}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>Valor Actual</Text>
                        <Text style={styles.value}>${asset.current_value || 0}</Text>
                    </View>
                </View>
            </View>

            {/* Dynamic Specs */}
            {asset.category && (
                <DynamicAttributeForm 
                    assetType={asset.category.asset_type}
                    attributes={asset.attributes?.map(a => ({
                        attribute_name: a.attribute_name,
                        attribute_value: a.attribute_value,
                        attribute_type: a.attribute_type
                    })) || []}
                    onChange={() => {}}
                    readOnly={true}
                />
            )}
        </View>
    );

    const renderHistoryTab = (type: 'assignments' | 'maintenance' | 'calibration') => {
        // Placeholder for history lists
        // In a real implementation, we would fetch history data here or passed in props
        return (
            <View style={styles.section}>
                <Text style={styles.emptyText}>Historial de {type} próximamente...</Text>
                {/* 
                   Here we would map through asset.maintenance_records, asset.calibration_records, etc.
                   if they were populated by the backend in the getAsset call.
                   The schema includes relationships, so typically we might need eager loading 
                   or separate fetch calls.
                   Current getAsset implementation does simple get, assuming relations might be loaded.
                   If not, we would need useEffect to fetch history.
                */}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Topbar title="Detalle de Activo" onBack={() => router.back()} />
            
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.assetTag}>{asset.asset_tag}</Text>
                            <Text style={styles.assetName}>{asset.name}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(asset.status) }]}>
                            <Text style={styles.statusText}>{asset.status.toUpperCase()}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.conditionRow}>
                        <Text style={styles.conditionLabel}>Condición:</Text>
                        <Text style={styles.conditionValue}>{asset.condition.toUpperCase()}</Text>
                    </View>

                    {/* Actions Bar */}
                    <View style={styles.actionsBar}>
                        {asset.status === 'disponible' ? (
                            <TouchableOpacity style={styles.actionButton} onPress={() => setShowAssignModal(true)}>
                                <Ionicons name="person-add" size={20} color="#fff" />
                                <Text style={styles.actionText}>Asignar</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.actionButton, styles.returnButton]} onPress={() => setShowReturnModal(true)}>
                                <Ionicons name="return-down-back" size={20} color="#fff" />
                                <Text style={styles.actionText}>Devolver</Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
                            <Ionicons name="build" size={20} color="#007AFF" />
                            <Text style={[styles.actionText, styles.secondaryActionText]}>Mantenimiento</Text>
                        </TouchableOpacity>

                        {asset.category?.asset_type === AssetType.EQUIPO_MEDICION && (
                            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
                                <Ionicons name="speedometer" size={20} color="#9C27B0" />
                                <Text style={[styles.actionText, { color: '#9C27B0' }]}>Calibrar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TabButton title="Info" active={activeTab === 'info'} onPress={() => setActiveTab('info')} />
                    <TabButton title="Asignaciones" active={activeTab === 'assignments'} onPress={() => setActiveTab('assignments')} />
                    <TabButton title="Mantenimiento" active={activeTab === 'maintenance'} onPress={() => setActiveTab('maintenance')} />
                    {asset.category?.asset_type === AssetType.EQUIPO_MEDICION && (
                        <TabButton title="Calibración" active={activeTab === 'calibration'} onPress={() => setActiveTab('calibration')} />
                    )}
                </View>

                {/* Tab Content */}
                {activeTab === 'info' && renderInfoTab()}
                {activeTab !== 'info' && renderHistoryTab(activeTab)}

            </ScrollView>

            {/* Modals */}
            <Modal visible={showAssignModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Asignar Activo</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="ID de Usuario" 
                            keyboardType="numeric"
                            value={assignUser}
                            onChangeText={setAssignUser}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setShowAssignModal(false)} style={styles.cancelButton}>
                                <Text>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAssign} style={styles.confirmButton}>
                                <Text style={styles.confirmText}>Asignar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showReturnModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Devolver Activo</Text>
                        <Text style={styles.label}>Condición de retorno:</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Ej: bueno, regular..." 
                            value={returnCondition}
                            onChangeText={setReturnCondition}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setShowReturnModal(false)} style={styles.cancelButton}>
                                <Text>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleReturn} style={styles.confirmButton}>
                                <Text style={styles.confirmText}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

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
        padding: 16,
    },
    headerCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    assetTag: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        backgroundColor: '#f0f0f0',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    assetName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    conditionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    conditionLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 4,
    },
    conditionValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    actionsBar: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
    },
    returnButton: {
        backgroundColor: '#FF9800',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    actionText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 4,
        fontSize: 12,
    },
    secondaryActionText: {
        color: '#007AFF',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 16,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTabButton: {
        backgroundColor: '#E3F2FD',
    },
    tabText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    infoItem: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
    },
    value: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    emptyText: {
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 20,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelButton: {
        padding: 10,
    },
    confirmButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    confirmText: {
        color: '#fff',
        fontWeight: '600',
    },
});
