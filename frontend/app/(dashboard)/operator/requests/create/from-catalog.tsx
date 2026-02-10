import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, RadioButton, Card, Divider, HelperText } from 'react-native-paper';
import { useRequestCart } from '@/context/RequestCartContext';
import { createMovementRequest, MovementType, MovementRequestCreate } from '@/services/movementService';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function CreateRequestFromCatalogScreen() {
  const { items, sourceWarehouseId, destinationWarehouseId, clearCart } = useRequestCart();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: MovementType.OUT,
    reason: '',
    reference: '',
  });

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No items selected.</Text>
        <Button onPress={() => router.back()}>Go Back to Catalog</Button>
      </View>
    );
  }

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const requestData: MovementRequestCreate = {
        type: formData.type,
        source_warehouse_id: sourceWarehouseId || undefined,
        destination_warehouse_id: destinationWarehouseId || undefined,
        reason: formData.reason,
        reference: formData.reference,
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
      };

      await createMovementRequest(requestData);
      Alert.alert('Success', 'Request created successfully', [
        { 
          text: 'OK', 
          onPress: () => {
            clearCart();
            router.replace('/(dashboard)/operator/catalog/operational'); 
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text variant="headlineSmall" style={styles.title}>Review Items</Text>
      {items.map((item, index) => (
        <Card key={item.product.id} style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">{item.product.name}</Text>
            <Text variant="bodySmall" style={{color: Colors.gray}}>{item.product.sku}</Text>
            <View style={styles.row}>
              <Text>Quantity: {item.quantity}</Text>
              {item.notes && <Text style={{fontStyle: 'italic'}}>Note: {item.notes}</Text>}
            </View>
          </Card.Content>
        </Card>
      ))}
      <Text style={styles.totalText}>Total Items: {items.reduce((sum, i) => sum + i.quantity, 0)}</Text>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text variant="headlineSmall" style={styles.title}>Request Details</Text>
      
      <Text variant="titleMedium" style={styles.label}>Request Type</Text>
      <RadioButton.Group onValueChange={value => setFormData({...formData, type: value as MovementType})} value={formData.type}>
        <View style={styles.radioRow}>
          <RadioButton value={MovementType.OUT} />
          <Text>Outbound (Use)</Text>
        </View>
        <View style={styles.radioRow}>
          <RadioButton value={MovementType.TRANSFER} />
          <Text>Transfer</Text>
        </View>
        <View style={styles.radioRow}>
            <RadioButton value={MovementType.IN} />
            <Text>Inbound (Return/New)</Text>
        </View>
      </RadioButton.Group>

      <TextInput
        label="Reason / Project"
        value={formData.reason}
        onChangeText={text => setFormData({...formData, reason: text})}
        mode="outlined"
        style={styles.input}
      />
      <HelperText type="info">Why are you requesting these items?</HelperText>

      <TextInput
        label="Reference (Optional)"
        value={formData.reference}
        onChangeText={text => setFormData({...formData, reference: text})}
        mode="outlined"
        style={styles.input}
      />
      <HelperText type="info">Work Order #, Ticket #, etc.</HelperText>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text variant="headlineSmall" style={styles.title}>Summary</Text>
      
      <View style={styles.summarySection}>
        <Text variant="labelLarge">Type:</Text>
        <Text>{formData.type}</Text>
      </View>
      
      <View style={styles.summarySection}>
        <Text variant="labelLarge">Reason:</Text>
        <Text>{formData.reason || '-'}</Text>
      </View>

      <View style={styles.summarySection}>
        <Text variant="labelLarge">Items:</Text>
        <Text>{items.length} products ({items.reduce((sum, i) => sum + i.quantity, 0)} total qty)</Text>
      </View>

      {sourceWarehouseId && (
        <View style={styles.summarySection}>
            <Text variant="labelLarge">Source Warehouse ID:</Text>
            <Text>{sourceWarehouseId}</Text>
        </View>
      )}

      {destinationWarehouseId && (
        <View style={styles.summarySection}>
            <Text variant="labelLarge">Destination Warehouse ID:</Text>
            <Text>{destinationWarehouseId}</Text>
        </View>
      )}

      <Divider style={{ marginVertical: 20 }} />
      <Text>Please confirm all details are correct before submitting.</Text>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressStep, step >= 1 && styles.activeStep]} />
        <View style={[styles.progressStep, step >= 2 && styles.activeStep]} />
        <View style={[styles.progressStep, step >= 3 && styles.activeStep]} />
      </View>

      <View style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </View>

      <View style={styles.footer}>
        <Button 
          mode="outlined" 
          onPress={() => step === 1 ? router.back() : setStep(step - 1)}
          style={styles.button}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        
        {step < 3 ? (
          <Button 
            mode="contained" 
            onPress={() => setStep(step + 1)}
            style={styles.button}
          >
            Next
          </Button>
        ) : (
          <Button 
            mode="contained" 
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Submit Request
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#e0e0e0',
  },
  progressStep: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  activeStep: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 20,
  },
  card: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  totalText: {
    textAlign: 'right',
    fontWeight: 'bold',
    marginTop: 10,
    fontSize: 16,
  },
  label: {
    marginTop: 10,
    marginBottom: 5,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  input: {
    marginTop: 10,
    backgroundColor: 'white',
  },
  summarySection: {
    marginBottom: 10,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    elevation: 4,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  }
});
