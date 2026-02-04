import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useAuth } from '../hooks/useAuth';
import CatalogScreen from '../app/(visitor)/catalog/index';
import * as productService from '../services/productService';

// Mock dependencies
jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    logout: jest.fn(),
  })),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../services/productService', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
}));

jest.mock('../constants/Colors', () => ({
  Colors: {
    primary: 'blue',
    background: 'white',
    white: 'white',
    textSecondary: 'gray',
  }
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
}));

// Mock React Native Paper
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  const React = require('react');
  const { View, TextInput, Text } = require('react-native');
  return {
    ...RealModule,
    useTheme: () => ({ colors: { primary: 'blue' } }),
    Searchbar: (props: any) => (
        <TextInput 
            testID="search-bar" 
            placeholder={props.placeholder} 
            onChangeText={props.onChangeText}
            value={props.value} 
        />
    ),
    ActivityIndicator: () => <Text>Loading...</Text>,
    IconButton: (props: any) => (
        <Text testID="logout-button" onPress={props.onPress}>Icon: {props.icon}</Text>
    ),
    Chip: (props: any) => (
        <View onTouchEnd={props.onPress}>
            <Text>{props.children}</Text>
        </View>
    )
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

  it('renders loading state initially', async () => {
    const { getByText } = render(<CatalogScreen />);
    expect(getByText('Cargando catálogo...')).toBeTruthy();
    // Wait for effect to finish to avoid unmount errors
    await waitFor(() => expect(productService.getProducts).toHaveBeenCalled());
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

  it('calls logout when logout button is pressed', async () => {
    const logoutMock = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({ logout: logoutMock });

    const { getByTestId, findByText } = render(<CatalogScreen />);
    
    await findByText('Product 1');
    
    const logoutButton = getByTestId('logout-button');
    fireEvent.press(logoutButton);
    
    expect(logoutMock).toHaveBeenCalled();
  });

  it('filters products when category is selected', async () => {
    const { getByText, findByText } = render(<CatalogScreen />);
    
    await findByText('Category 1');
    
    fireEvent(getByText('Category 1'), 'onTouchEnd');

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenCalledWith(expect.objectContaining({
        category_id: 1
      }));
    });
  });
});
