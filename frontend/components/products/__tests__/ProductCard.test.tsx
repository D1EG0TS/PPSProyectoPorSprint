import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { PaperProvider } from 'react-native-paper';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

const mockProduct = {
    id: 1,
    name: 'Test Product',
    sku: 'SKU-123',
    price: 99.99,
    category_id: 1,
    unit_id: 1,
    is_active: true,
    min_stock: 10
};

describe('ProductCard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders product details correctly', () => {
        const { getByText } = render(<ProductCard product={mockProduct} />, { wrapper: Wrapper });
        
        expect(getByText('Test Product')).toBeTruthy();
        expect(getByText('SKU: SKU-123')).toBeTruthy();
        expect(getByText('$99.99')).toBeTruthy();
    });

    it('navigates to details when pressed (default behavior)', () => {
        const { getByText } = render(<ProductCard product={mockProduct} />, { wrapper: Wrapper });
        
        fireEvent.press(getByText('Test Product'));
        expect(mockPush).toHaveBeenCalledWith('/(visitor)/catalog/1');
    });

    it('calls custom onPress if provided', () => {
        const onPress = jest.fn();
        const { getByText } = render(<ProductCard product={mockProduct} onPress={onPress} />, { wrapper: Wrapper });
        
        fireEvent.press(getByText('Test Product'));
        expect(onPress).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
    });
});
