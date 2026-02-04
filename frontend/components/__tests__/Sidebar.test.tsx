import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Sidebar } from '../Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../constants/roles';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/',
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
}));

describe('Sidebar', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly for Super Admin', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 1,
        email: 'admin@example.com',
        full_name: 'Admin User',
        role_id: USER_ROLES.SUPER_ADMIN,
      },
      logout: mockLogout,
    });

    const { getByText } = render(<Sidebar />);

    // Should see all items
    expect(getByText('Dashboard')).toBeTruthy();
    expect(getByText('Usuarios')).toBeTruthy();
    expect(getByText('Inventario')).toBeTruthy();
    expect(getByText('Configuración')).toBeTruthy();
    expect(getByText('Super Admin')).toBeTruthy();
    expect(getByText('Admin User')).toBeTruthy();
  });

  it('renders correctly for Guest', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 2,
        email: 'user@example.com',
        full_name: 'Guest User',
        role_id: USER_ROLES.GUEST,
      },
      logout: mockLogout,
    });

    const { getByText, queryByText } = render(<Sidebar />);

    // Should see Dashboard
    expect(getByText('Dashboard')).toBeTruthy();
    
    // Should NOT see Admin items
    expect(queryByText('Usuarios')).toBeNull();
    expect(queryByText('Configuración')).toBeNull();
    expect(queryByText('Inventario')).toBeNull();
    
    // Check role name display
    expect(getByText('Invitado')).toBeTruthy();
  });
});
