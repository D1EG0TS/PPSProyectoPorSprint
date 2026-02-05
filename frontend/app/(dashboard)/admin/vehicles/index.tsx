import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, FAB, Chip, useTheme, Searchbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScrollableContent } from '../../../../components/ScrollableContent';
import { Table } from '../../../../components/Table';
import vehicleService, { Vehicle, VehicleStatus } from '../../../../services/vehicleService';

const VehicleListScreen = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const theme = useTheme();

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getAll();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [])
  );

  const getStatusColor = (vehicle: Vehicle) => {
    // Red: Inactive or Expired Insurance
    if (vehicle.status !== VehicleStatus.AVAILABLE && vehicle.status !== VehicleStatus.ASSIGNED) return '#ffebee'; // Light Red background
    
    if (vehicle.insurance_expiration) {
      const expDate = new Date(vehicle.insurance_expiration);
      const now = new Date();
      const diffTime = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return '#ffebee'; // Expired
      if (diffDays < 30) return '#fff8e1'; // Warning (Yellow)
    } else {
       // No insurance info -> Warning
       return '#fff8e1';
    }
    
    return '#e8f5e9'; // Good (Green)
  };

  const getStatusIcon = (vehicle: Vehicle) => {
    if (vehicle.status !== VehicleStatus.AVAILABLE && vehicle.status !== VehicleStatus.ASSIGNED) return 'alert-circle';
    
    if (vehicle.insurance_expiration) {
        const expDate = new Date(vehicle.insurance_expiration);
        const now = new Date();
        if (expDate < now) return 'alert-circle';
    }
    return 'check-circle';
  }

  const filteredVehicles = vehicles.filter(v => 
    v.vin.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { 
        key: 'license_plate', 
        label: 'Plate', 
        width: 100,
        renderCell: (item: Vehicle) => <Text style={{fontWeight: 'bold'}}>{item.license_plate}</Text> 
    },
    { 
        key: 'model', 
        label: 'Brand/Model', 
        width: 200,
        renderCell: (item: Vehicle) => <Text>{item.brand} {item.model} ({item.year})</Text> 
    },
    { 
        key: 'status', 
        label: 'Status', 
        width: 120,
        renderCell: (item: Vehicle) => <Chip mode="outlined" style={{height: 28}} textStyle={{fontSize: 10, lineHeight: 18}}>{item.status}</Chip> 
    },
    { 
        key: 'insurance', 
        label: 'Insurance', 
        width: 150,
        renderCell: (item: Vehicle) => {
            const color = getStatusColor(item);
            return (
                <View style={[styles.statusBadge, { backgroundColor: color }]}>
                    <Text variant="bodySmall" style={{ color: '#333' }}>
                        {item.insurance_expiration || 'N/A'}
                    </Text>
                </View>
            );
        }
    },
    { 
        key: 'actions', 
        label: 'Actions', 
        width: 100,
        renderCell: (item: Vehicle) => (
            <Button mode="text" onPress={() => router.push(`/admin/vehicles/${item.id}`)}>
                Details
            </Button>
        )
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollableContent>
        <View style={styles.header}>
          <Text variant="headlineMedium">Vehicle Management</Text>
          <Button mode="contained" onPress={() => router.push('/admin/vehicles/create')}>
            + New Vehicle
          </Button>
        </View>

        <Searchbar
          placeholder="Search by VIN, Plate, Brand..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <Table
          columns={columns}
          data={filteredVehicles}
          keyExtractor={(item: Vehicle) => item.id.toString()}
          loading={loading}
          emptyMessage="No vehicles found"
        />
      </ScrollableContent>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default VehicleListScreen;
