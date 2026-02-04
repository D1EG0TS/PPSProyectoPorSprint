import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Chip, Portal, Modal, Dialog } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import vehicleService, { Vehicle, VehicleDocument } from '../../../../services/vehicleService';
import { getExpirationStatus } from '../../../../utils/date';

interface PendingDocument extends VehicleDocument {
  vehicle_vin: string;
  vehicle_plate: string;
}

const PendingValidationScreen = () => {
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PendingDocument | null>(null);
  const [evidenceVisible, setEvidenceVisible] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      // In a real app, we'd have a specific endpoint for this.
      // For now, fetch all vehicles and filter.
      const vehicles = await vehicleService.getAll();
      const docs: PendingDocument[] = [];
      
      vehicles.forEach((v: Vehicle) => {
        if (v.documents) {
            v.documents.forEach((d: VehicleDocument) => {
                if (!d.verified) {
                    docs.push({
                        ...d,
                        vehicle_vin: v.vin,
                        vehicle_plate: v.license_plate
                    });
                }
            });
        }
      });
      
      setPendingDocs(docs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
        fetchPending();
    }, [])
  );

  const handleValidate = async () => {
    if (!selectedDoc) return;
    try {
        await vehicleService.validateDocument(selectedDoc.id, {
            verified: true,
            evidence_id: selectedDoc.evidence_id // Passing existing evidence
        });
        setEvidenceVisible(false);
        setSelectedDoc(null);
        fetchPending();
    } catch (error) {
        console.error("Validation failed", error);
        alert("Validation failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.header}>Pending Document Validations</Text>
      
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? <Text>Loading...</Text> : pendingDocs.length === 0 ? <Text>No pending documents.</Text> : null}
        
        {pendingDocs.map(doc => (
            <Card key={doc.id} style={styles.card}>
                <Card.Title 
                    title={doc.document_type} 
                    subtitle={`${doc.vehicle_plate} (VIN: ${doc.vehicle_vin})`}
                    right={(props) => {
                        const status = getExpirationStatus(doc.expiration_date);
                        return (
                            <Chip {...props} style={{marginRight: 10, backgroundColor: status.color + '20'}} textStyle={{color: status.color}}>
                                {status.label}: {doc.expiration_date}
                            </Chip>
                        );
                    }}
                />
                <Card.Content>
                    <Text>Evidence ID: {doc.evidence_id || 'None'}</Text>
                </Card.Content>
                <Card.Actions>
                    <Button onPress={() => { setSelectedDoc(doc); setEvidenceVisible(true); }}>Review & Validate</Button>
                </Card.Actions>
            </Card>
        ))}
      </ScrollView>

      <Portal>
        <Dialog visible={evidenceVisible} onDismiss={() => setEvidenceVisible(false)}>
            <Dialog.Title>Review Document</Dialog.Title>
            <Dialog.Content>
                <Text variant="bodyMedium">Document Type: {selectedDoc?.document_type}</Text>
                <Text variant="bodyMedium">Vehicle: {selectedDoc?.vehicle_plate}</Text>
                <Text variant="bodyMedium" style={{marginTop: 10, fontWeight: 'bold'}}>Evidence Preview:</Text>
                <View style={styles.evidencePlaceholder}>
                    <Text>{selectedDoc?.evidence_id ? `[File: ${selectedDoc.evidence_id}]` : "No Evidence Uploaded"}</Text>
                    {/* In real app, show Image or PDF viewer here */}
                </View>
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setEvidenceVisible(false)}>Cancel</Button>
                <Button mode="contained" onPress={handleValidate} disabled={!selectedDoc?.evidence_id}>
                    Validate
                </Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 16,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 10,
  },
  evidencePlaceholder: {
    height: 150,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  }
});

export default PendingValidationScreen;
