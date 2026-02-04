import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateRequestScreen from '../create';
import { warehouseService } from '../../../../../services/warehouseService';
import * as movementService from '../../../../../services/movementService';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('../../../../../services/warehouseService');
jest.mock('../../../../../services/movementService');
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

// Mock ProductSearch component
jest.mock('../../../../../components/products/ProductSearch', () => {
    const { Button } = require('react-native');
    return {
        ProductSearch: ({ onSelect }: any) => (
            <Button 
                title="Select Test Product" 
                onPress={() => onSelect({ id: 1, name: 'Test Product', sku: 'SKU1' })} 
                testID="product-search-mock"
            />
        ),
    };
});

// Mock Paper
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');
  return {
    ...RealModule,
    Menu: ({ visible, onDismiss, anchor, children }: any) => (
      <View>
        <View>{anchor}</View>
        {visible && <View testID="menu-content">{children}</View>}
      </View>
    ),
    Divider: () => null,
  };
});

describe('CreateRequestScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (warehouseService.getWarehouses as jest.Mock).mockResolvedValue([
            { id: 1, name: 'Warehouse A' },
            { id: 2, name: 'Warehouse B' }
        ]);
    });

    it('renders correctly', () => {
        const { getByText } = render(<CreateRequestScreen />);
        expect(getByText('Nueva Solicitud')).toBeTruthy();
    });

    it('validates required fields', async () => {
        const { getByText, findByText } = render(<CreateRequestScreen />);
        
        // Find the submit button
        const submitBtn = await findByText('Enviar Solicitud');
        fireEvent.press(submitBtn);
        
        await waitFor(() => {
            expect(getByText('El motivo es obligatorio')).toBeTruthy();
            expect(getByText('Debe agregar al menos un producto')).toBeTruthy();
        });
    });

    it('adds a product when selected', async () => {
        const { getByText, getByTestId } = render(<CreateRequestScreen />);
        
        fireEvent.press(getByTestId('product-search-mock'));
        
        await waitFor(() => {
            expect(getByText('Test Product')).toBeTruthy();
        });
    });
});
