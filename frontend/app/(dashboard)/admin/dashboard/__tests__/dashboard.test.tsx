import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AdminDashboard from '../index';
import * as reportService from '../../../../../services/reportService';

// Mock dependencies
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: any) => React.useEffect(cb, []),
  };
});

jest.mock('react-native-chart-kit', () => ({
  BarChart: () => null,
  LineChart: () => null,
  PieChart: () => null,
}));

jest.mock('../../../../../services/reportService');

describe('AdminDashboard', () => {
  const mockSummary = {
    total_items: 100,
    total_value: 5000,
    total_products: 10,
  };

  const mockTurnover = [
    { category: 'Electronics', total_out: 50, movement_count: 5 },
  ];

  const mockMovements = [
    { date: '2024-01-01', type: 'IN', total_quantity: 10 },
    { date: '2024-01-02', type: 'OUT', total_quantity: 5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (reportService.getInventorySummary as jest.Mock).mockResolvedValue(mockSummary);
    (reportService.getInventoryTurnover as jest.Mock).mockResolvedValue(mockTurnover);
    (reportService.getMovementsDaily as jest.Mock).mockResolvedValue(mockMovements);
  });

  it('renders dashboard with data', async () => {
    const { getByText, findByText } = render(<AdminDashboard />);

    // Initial loading state might be too fast to catch without timers, but we expect data eventually
    await findByText('Total Items');
    expect(getByText('100')).toBeTruthy();
    
    // Check for formatted currency
    // Use regex to match 5000 with potential separators or currency symbol
    // The debug output suggests there might be newlines or split text
    await findByText(/5[,.]000|5000/);
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (reportService.getInventorySummary as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { queryByText } = render(<AdminDashboard />);

    await waitFor(() => {
      // Should not crash, maybe show empty state or just stop loading
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
