import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WarehouseStockCell } from '../catalog/internal/WarehouseStockCell';

// Mock the hooks
const mockUseRealTimeStock = jest.fn();
jest.mock('../../hooks/useRealTimeStock', () => ({
  useRealTimeStock: (...args: any[]) => mockUseRealTimeStock(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock React Native Paper
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  const { View } = require('react-native'); // Require View here
  const MockModal = ({ children, visible, onDismiss }: any) => {
    return visible ? <View testID="modal-content">{children}</View> : null;
  };
  return {
    ...RealModule,
    Modal: MockModal,
    Portal: ({ children }: any) => <>{children}</>,
  };
});

const mockStocks = [
  { warehouse_id: 1, warehouse_name: 'WH1', quantity: 10 },
  { warehouse_id: 2, warehouse_name: 'WH2', quantity: 20 },
];

describe('WarehouseStockCell', () => {
  beforeEach(() => {
    mockUseRealTimeStock.mockClear();
    mockUseAuth.mockReturnValue({ user: { id: 1 } });
  });

  it('renders global stock total when available', () => {
    // Mock global stock (no warehouseId passed) -> returns 50 (different from 10+20=30)
    mockUseRealTimeStock.mockImplementation((prodId, warehouseId) => {
      if (!warehouseId) return { stock: 50, loading: false };
      return { stock: null, loading: true };
    });

    const { getByText } = render(
      <WarehouseStockCell stocks={mockStocks} productId={123} />
    );

    // Should show "50 in 2 warehouses"
    expect(getByText('50 in 2 warehouses')).toBeTruthy();
  });

  it('renders fallback total when real-time is loading/null', () => {
    mockUseRealTimeStock.mockReturnValue({ stock: null, loading: true });

    const { getByText } = render(
      <WarehouseStockCell stocks={mockStocks} productId={123} />
    );

    // Should show "30 in 2 warehouses" (10+20)
    expect(getByText('30 in 2 warehouses')).toBeTruthy();
  });

  it('renders single warehouse directly', () => {
    mockUseRealTimeStock.mockReturnValue({ stock: 15, loading: false });
    const singleStock = [{ warehouse_id: 1, warehouse_name: 'WH1', quantity: 10 }];

    const { getByText } = render(
      <WarehouseStockCell stocks={singleStock} productId={123} />
    );

    // Should show "WH1: 15"
    expect(getByText('WH1: 15')).toBeTruthy();
  });

  it('renders breakdown with real-time values in modal', async () => {
     // Mock specific warehouse returns
     mockUseRealTimeStock.mockImplementation((prodId, warehouseId) => {
        if (!warehouseId) return { stock: 50, loading: false }; // Global
        if (warehouseId === 1) return { stock: 15, loading: false }; // WH1 updated
        if (warehouseId === 2) return { stock: 25, loading: false }; // WH2 updated
        return { stock: 0 };
     });

    const { getByText } = render(
      <WarehouseStockCell stocks={mockStocks} productId={123} />
    );

    // Open modal
    fireEvent.press(getByText('50 in 2 warehouses'));

    // Check modal content
    // WH1 should be 15 (updated from 10)
    expect(getByText('15')).toBeTruthy();
    // WH2 should be 25 (updated from 20)
    expect(getByText('25')).toBeTruthy();
  });
});
