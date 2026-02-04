import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Divider, Chip, Portal, Modal, TextInput, useTheme, SegmentedButtons } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import vehicleService, { Vehicle, VehicleDocument, VehicleMaintenance, DocumentType, MaintenanceType } from '../../../../services/vehicleService';
import DocumentTimeline from '../../../../components/vehicles/DocumentTimeline';
import EvidenceUpload from '../../../../components/vehicles/EvidenceUpload';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '../../../../components/Input';
import { Picker } from '@react-native-picker/picker';
import { getExpirationStatus } from '../../../../utils/date';

const VehicleDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const theme = useTheme();
  const router = useRouter();

  // Modals
  const [showDocModal, setShowDocModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);

  const fetchVehicle = async () => {
    setLoading(true);
    try {
      if (id) {
        const data = await vehicleService.getById(Number(id));
        setVehicle(data);
      }
    } catch (error) {
      console.error('Error fetching vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
        fetchVehicle();
    }, [id])
  );

  if (loading || !vehicle) {
    return <View style={styles.loadingContainer}><Text>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
            <Text variant="headlineSmall">{vehicle.brand} {vehicle.model} ({vehicle.year})</Text>
            <Text variant="titleMedium" style={{color: '#666'}}>VIN: {vehicle.vin} | Plate: {vehicle.license_plate}</Text>
        </View>
        <Chip mode="outlined" style={styles.statusChip}>{vehicle.status}</Chip>
      </View>

      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'info', label: 'Info' },
          { value: 'documents', label: 'Documents' },
          { value: 'maintenances', label: 'Maintenance' },
          { value: 'history', label: 'Timeline' },
        ]}
        style={styles.tabs}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'info' && <InfoTab vehicle={vehicle} />}
        {tab === 'documents' && <DocumentsTab vehicle={vehicle} onRefresh={fetchVehicle} />}
        {tab === 'maintenances' && <MaintenancesTab vehicle={vehicle} onRefresh={fetchVehicle} />}
        {tab === 'history' && <DocumentTimeline documents={vehicle.documents || []} maintenances={vehicle.maintenances || []} />}
      </ScrollView>
    </View>
  );
};

// --- Sub-Components ---

const InfoTab = ({ vehicle }: { vehicle: Vehicle }) => (
  <Card>
    <Card.Content>
      <DetailRow label="Brand" value={vehicle.brand} />
      <DetailRow label="Model" value={vehicle.model} />
      <DetailRow label="Year" value={vehicle.year.toString()} />
      <DetailRow label="License Plate" value={vehicle.license_plate} />
      <DetailRow label="VIN" value={vehicle.vin} />
      <DetailRow label="Odometer" value={`${vehicle.odometer} km`} />
      <Divider style={{ marginVertical: 10 }} />
      <DetailRow label="Insurance Policy" value={vehicle.insurance_policy || 'N/A'} />
      <DetailRow label="Insurance Exp." value={vehicle.insurance_expiration || 'N/A'} />
      <DetailRow label="Assigned To ID" value={vehicle.assigned_to?.toString() || 'Unassigned'} />
    </Card.Content>
  </Card>
);

const DocumentsTab = ({ vehicle, onRefresh }: { vehicle: Vehicle, onRefresh: () => void }) => {
  const [visible, setVisible] = useState(false);
  const { control, handleSubmit, reset, setValue } = useForm();
  
  const onSubmit = async (data: any) => {
    try {
        await vehicleService.addDocument(vehicle.id, {
            document_type: data.document_type,
            expiration_date: data.expiration_date,
            evidence_id: data.evidence_id
        });
        setVisible(false);
        reset();
        onRefresh();
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <View>
      <Button mode="contained" icon="plus" onPress={() => setVisible(true)} style={{ marginBottom: 10 }}>
        Add Document
      </Button>
      
      {(vehicle.documents || []).map((doc) => {
        const expStatus = getExpirationStatus(doc.expiration_date);
        return (
        <Card key={doc.id} style={{ marginBottom: 8 }}>
            <Card.Title 
                title={doc.document_type} 
                subtitle={`Exp: ${doc.expiration_date || 'N/A'}`}
                subtitleStyle={{ color: expStatus.color, fontWeight: 'bold' }}
                right={(props) => <Chip {...props} icon={doc.verified ? 'check' : 'alert-circle-outline'} style={{marginRight: 10}}>{doc.verified ? 'Verified' : 'Pending'}</Chip>}
            />
            <Card.Content>
                <Text>Evidence ID: {doc.evidence_id || 'None'}</Text>
            </Card.Content>
        </Card>
      )})}

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{marginBottom: 10}}>Add Document</Text>
          
          <Text style={{marginBottom: 5}}>Type</Text>
          <Controller
            control={control}
            name="document_type"
            defaultValue={DocumentType.INSURANCE}
            render={({ field: { onChange, value } }) => (
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={value} onValueChange={onChange}>
                    {Object.values(DocumentType).map(t => <Picker.Item key={t} label={t} value={t} />)}
                  </Picker>
                </View>
            )}
          />

          <Input control={control} name="expiration_date" label="Expiration Date (YYYY-MM-DD)" placeholder="2025-12-31" />
          
          <Controller
            control={control}
            name="evidence_id"
            rules={{ required: true }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <EvidenceUpload 
                    onUploadComplete={onChange} 
                    error={error ? "Evidence is required" : undefined}
                />
            )}
          />

          <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginTop: 10 }}>
            Save Document
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const MaintenancesTab = ({ vehicle, onRefresh }: { vehicle: Vehicle, onRefresh: () => void }) => {
    const [visible, setVisible] = useState(false);
    const { control, handleSubmit, reset } = useForm();
    
    const onSubmit = async (data: any) => {
      try {
          await vehicleService.addMaintenance(vehicle.id, {
              ...data,
              cost: Number(data.cost),
              odometer: Number(data.odometer),
          });
          setVisible(false);
          reset();
          onRefresh();
      } catch (e) {
          console.error(e);
      }
    };
  
    return (
      <View>
        <Button mode="contained" icon="plus" onPress={() => setVisible(true)} style={{ marginBottom: 10 }}>
          Log Maintenance
        </Button>
        
        {(vehicle.maintenances || []).map((m) => (
          <Card key={m.id} style={{ marginBottom: 8 }}>
              <Card.Title title={m.maintenance_type} subtitle={m.date} />
              <Card.Content>
                  <Text>{m.description}</Text>
                  <Text style={{marginTop: 5, fontWeight: 'bold'}}>{m.provider} - ${m.cost}</Text>
              </Card.Content>
          </Card>
        ))}
  
        <Portal>
          <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
            <Text variant="titleLarge" style={{marginBottom: 10}}>Log Maintenance</Text>
            
            <Text style={{marginBottom: 5}}>Type</Text>
            <Controller
              control={control}
              name="maintenance_type"
              defaultValue={MaintenanceType.PREVENTIVE}
              render={({ field: { onChange, value } }) => (
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={value} onValueChange={onChange}>
                      {Object.values(MaintenanceType).map(t => <Picker.Item key={t} label={t} value={t} />)}
                    </Picker>
                  </View>
              )}
            />
  
            <Input control={control} name="date" label="Date (YYYY-MM-DD)" placeholder="2025-01-01" />
            <Input control={control} name="provider" label="Provider" />
            <Input control={control} name="cost" label="Cost" keyboardType="numeric" />
            <Input control={control} name="odometer" label="Odometer" keyboardType="numeric" />
            <Input control={control} name="description" label="Description" multiline />
            
            <Button mode="contained" onPress={handleSubmit(onSubmit)} style={{ marginTop: 10 }}>
              Save Log
            </Button>
          </Modal>
        </Portal>
      </View>
    );
};

const DetailRow = ({ label, value }: { label: string, value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusChip: {
    height: 30,
  },
  tabs: {
    marginBottom: 16,
  },
  content: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    color: '#555',
  },
  value: {
    flex: 1,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 10,
  }
});

export default VehicleDetailScreen;
