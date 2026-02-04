import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CatalogScreen from '../app/(visitor)/catalog/index';
import * as productService from '../services/productService';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../services/productService', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
}));

// Mock React Native Paper
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  return {
    ...RealModule,
    useTheme: () => ({ colors: { primary: 'blue' } }),
  };
});

describe('CatalogScreen', () => {
  const mockProducts = [
    { id: 1, name: 'Product 1', sku: 'SKU1', price: 10.0, category_id: 1, unit_id: 1 },
    { id: 2, name: 'Product 2', sku: 'SKU2', price: 20.0, category_id: 2, unit_id: 1 },
  ];

  const mockCategories = [
    { id: 1, name: 'Category 1' },
    { id: 2, name: 'Category 2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (productService.getProducts as jest.Mock).mockResolvedValue(mockProducts);
    (productService.getCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  it('renders loading state initially', () => {
    const { getByText } = render(<CatalogScreen />);
    expect(getByText('Cargando catálogo...')).toBeTruthy();
  });

  it('renders products and categories after loading', async () => {
    const { getByText, findByText } = render(<CatalogScreen />);

    await findByText('Product 1');
    expect(getByText('Product 2')).toBeTruthy();
    expect(getByText('Category 1')).toBeTruthy();
    expect(getByText('Category 2')).toBeTruthy();
  });

  it('filters products when search query changes', async () => {
    const { getByPlaceholderText, findByText } = render(<CatalogScreen />);
    
    await findByText('Product 1');
    
    const searchInput = getByPlaceholderText('Buscar productos...');
    fireEvent.changeText(searchInput, 'Test Search');

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenCalledWith(expect.objectContaining({
        search: 'Test Search'
      }));
    });
  });

  it('filters products when category is selected', async () => {
    const { getByText, findByText } = render(<CatalogScreen />);
    
    await findByText('Category 1');
    
    fireEvent.press(getByText('Category 1'));

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenCalledWith(expect.objectContaining({
        category_id: 1
      }));
    });
  });
});
