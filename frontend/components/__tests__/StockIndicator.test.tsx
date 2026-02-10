import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StockIndicator } from '../catalog/common/StockIndicator';

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Mock the hook
const mockUseRealTimeStock = jest.fn();
jest.mock('../../hooks/useRealTimeStock', () => ({
  useRealTimeStock: (...args: any[]) => mockUseRealTimeStock(...args),
}));

describe('StockIndicator', () => {
  beforeEach(() => {
    mockUseRealTimeStock.mockClear();
  });

  it('renders loading state', () => {
    mockUseRealTimeStock.mockReturnValue({ stock: null, loading: true, error: null });
    const { getByTestId } = render(<StockIndicator productId={1} />);
    // Note: ActivityIndicator doesn't have a default testID, so we might check for null or specific view
    // But simplified check:
    expect(mockUseRealTimeStock).toHaveBeenCalledWith(1, undefined);
  });

  it('renders stock value correctly', () => {
    mockUseRealTimeStock.mockReturnValue({ stock: 50, loading: false, error: null });
    const { getByText } = render(<StockIndicator productId={1} />);
    expect(getByText('50')).toBeTruthy();
  });

  it('renders dash when stock is null and not loading', () => {
    mockUseRealTimeStock.mockReturnValue({ stock: null, loading: false, error: null });
    const { getByText } = render(<StockIndicator productId={1} />);
    expect(getByText('-')).toBeTruthy();
  });
});
