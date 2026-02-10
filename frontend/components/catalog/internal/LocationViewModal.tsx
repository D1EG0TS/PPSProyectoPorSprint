import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, DataTable } from 'react-native-paper';
import { CatalogLocation } from '../../../types/catalog';

interface LocationViewModalProps {
  visible: boolean;
  onDismiss: () => void;
  productName: string;
  locations: CatalogLocation[];
}

export const LocationViewModal: React.FC<LocationViewModalProps> = ({ 
  visible, 
  onDismiss, 
  productName, 
  locations 
}) => {
  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={styles.container}
      >
        <Text variant="headlineSmall" style={styles.title}>
          Locations: {productName}
        </Text>
        
        <ScrollView style={styles.scroll}>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Warehouse</DataTable.Title>
              <DataTable.Title>Code</DataTable.Title>
              <DataTable.Title numeric>Qty</DataTable.Title>
            </DataTable.Header>

            {locations.length === 0 ? (
              <View style={styles.empty}>
                <Text>No specific locations assigned.</Text>
              </View>
            ) : (
              locations.map((loc, index) => (
                <DataTable.Row key={`${loc.warehouse_name}-${loc.location_code}-${index}`}>
                  <DataTable.Cell>{loc.warehouse_name}</DataTable.Cell>
                  <DataTable.Cell>
                    {loc.location_code}
                    {loc.aisle && ` (${loc.aisle}-${loc.rack}-${loc.shelf})`}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>{loc.quantity}</DataTable.Cell>
                </DataTable.Row>
              ))
            )}
          </DataTable>
        </ScrollView>
        
        <Button mode="contained" onPress={onDismiss} style={styles.button}>
          Close
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  title: {
    marginBottom: 10,
  },
  scroll: {
    maxHeight: 400,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    marginTop: 20,
  }
});
