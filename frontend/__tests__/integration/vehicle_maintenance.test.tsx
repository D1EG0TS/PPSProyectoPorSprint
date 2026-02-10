import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import VehicleDetailScreen from '../../app/(dashboard)/admin/vehicles/[id]';
import vehicleService, { Vehicle, MaintenanceType, VehicleStatus } from '../../services/vehicleService';
import { Provider as PaperProvider } from 'react-native-paper';

// Mock services
jest.mock('../../services/vehicleService');

// Mock Navigation
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useLocalSearchParams: () => ({ id: '1' }),
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }),
    useFocusEffect: (callback: any) => React.useEffect(callback, []), // Run once on mount
  };
});

// Mock EvidenceUpload since it might use complex native modules
jest.mock('../../components/vehicles/EvidenceUpload', () => {
    const React = require('react');
    const { View, Button, Text } = require('react-native');
    return ({ onUploadComplete, initialValue }: any) => (
        <View>
            <Text>Evidence Component</Text>
            <Button title="Mock Upload" onPress={() => onUploadComplete('evidence-123')} />
        </View>
    );
});

describe('Vehicle Maintenance Integration', () => {
  const mockVehicle: Vehicle = {
    id: 1,
    vin: '1234567890ABC',
    license_plate: 'ABC-123',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    odometer: 50000,
    status: VehicleStatus.AVAILABLE,
    maintenances: [
      {
        id: 101,
        vehicle_id: 1,
        maintenance_type: MaintenanceType.PREVENTIVE,
        date: '2025-01-01',
        provider: 'AutoFix',
        cost: 150,
        description: 'Oil Change',
        evidence_id: 'ev-001'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (vehicleService.getById as jest.Mock).mockResolvedValue(mockVehicle);
  });

  it('Renders maintenance list correctly', async () => {
    const { getByText, getByLabelText } = render(
      <PaperProvider>
        <VehicleDetailScreen />
      </PaperProvider>
    );

    // Switch to Maintenance Tab
    // Note: SegmentedButtons might be tricky to query by text directly depending on implementation, 
    // but usually labels are text.
    await waitFor(() => {
        fireEvent.press(getByText('Maintenance'));
    });

    await waitFor(() => {
      expect(getByText('Oil Change')).toBeTruthy();
      expect(getByText('AutoFix - $150')).toBeTruthy();
      expect(getByText('Has Evidence')).toBeTruthy();
    });
  });

  it('Can add new maintenance record', async () => {
    (vehicleService.addMaintenance as jest.Mock).mockResolvedValue({ id: 102 });

    const { getByText, getByPlaceholderText } = render(
        <PaperProvider>
          <VehicleDetailScreen />
        </PaperProvider>
      );
  
      // Switch to Maintenance Tab
      await waitFor(() => fireEvent.press(getByText('Maintenance')));
  
      // Click Log Maintenance
      fireEvent.press(getByText('Log Maintenance'));
  
      await waitFor(() => getByText('Save Log'));
  
      // Fill Form
      fireEvent.changeText(getByPlaceholderText('2025-01-01'), '2025-02-01');
      fireEvent.changeText(getByPlaceholderText('Workshop Name'), 'New Shop'); 
      
      // Submit
      fireEvent.press(getByText('Save Log'));

      await waitFor(() => {
        expect(vehicleService.addMaintenance).toHaveBeenCalledWith(1, expect.objectContaining({
            provider: 'New Shop',
            date: '2025-02-01'
        }));
      });
  });
  
  // Re-write test with simpler expectations due to UI complexity
  it('Calls delete maintenance', async () => {
    (vehicleService.deleteMaintenance as jest.Mock).mockResolvedValue({});

    const { getByText, getAllByText } = render(
      <PaperProvider>
        <VehicleDetailScreen />
      </PaperProvider>
    );

    await waitFor(() => fireEvent.press(getByText('Maintenance')));

    // Click Delete (Del)
    const delButtons = getAllByText('Del');
    fireEvent.press(delButtons[0]);

    await waitFor(() => {
      expect(vehicleService.deleteMaintenance).toHaveBeenCalledWith(101);
    });
  });
});
