import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { InternalCatalogTable } from '../../components/catalog/internal/InternalCatalogTable';
import { AdminCatalogItem, InternalCatalogItem } from '../../types/catalog';

// Mock data
const mockAdminItem: AdminCatalogItem = {
  id: 1,
  sku: 'TEST-001',
  name: 'Test Product',
  total_stock: 10,
  available_stock: 10,
  can_add_to_request: true,
  min_stock: 5,
  needs_reorder: false,
  stock_by_warehouse: [],
  locations: [{ warehouse_name: 'WH1', location_code: 'A1', quantity: 10 }],
  cost: 50.0,
  price: 100.0
};

const mockInternalItem: InternalCatalogItem = {
  id: 2,
  sku: 'TEST-002',
  name: 'Moderator Product',
  total_stock: 5,
  available_stock: 5,
  can_add_to_request: true,
  min_stock: 10,
  needs_reorder: true,
  stock_by_warehouse: []
};

describe('InternalCatalogTable', () => {
  const defaultProps = {
    onAdjustStock: jest.fn(),
    onRequest: jest.fn(),
  };

  it('renders correctly for Admin (sees costs and locations)', () => {
    const permissions = {
      can_see_stock: true,
      can_see_locations: true,
      can_see_costs: true,
      can_add_to_request: true,
      can_export_data: true
    };

    render(
      <InternalCatalogTable 
        items={[mockAdminItem]} 
        permissions={permissions} 
        {...defaultProps} 
      />
    );

    expect(screen.getByText('Test Product')).toBeTruthy();
    expect(screen.getByText('$50')).toBeTruthy(); // Cost visible
    // Check for location icon (accessibility label or icon name)
    // Since we use IconButton, we might not see icon name easily in text
    // We can check if column header exists
    expect(screen.getByText('Cost')).toBeTruthy();
  });

  it('renders correctly for Moderator (NO costs)', () => {
    const permissions = {
      can_see_stock: true,
      can_see_locations: false, // Moderator usually doesn't see detailed locations in list?
      can_see_costs: false,
      can_add_to_request: true,
      can_export_data: false
    };

    render(
      <InternalCatalogTable 
        items={[mockInternalItem]} 
        permissions={permissions} 
        {...defaultProps} 
      />
    );

    expect(screen.getByText('Moderator Product')).toBeTruthy();
    expect(screen.queryByText('$50')).toBeNull(); // Cost NOT visible
    expect(screen.queryByText('Cost')).toBeNull(); // Header NOT visible
  });

  it('shows stock badge correctly', () => {
     const permissions = {
      can_see_stock: true,
      can_see_locations: false,
      can_see_costs: false,
      can_add_to_request: true,
      can_export_data: false
    };

    render(
      <InternalCatalogTable 
        items={[mockInternalItem]} // Has needs_reorder=true (5 < 10)
        permissions={permissions} 
        {...defaultProps} 
      />
    );

    // StockBadge logic: if < min -> Low Stock
    expect(screen.getByText(/Low Stock/)).toBeTruthy();
  });
});
