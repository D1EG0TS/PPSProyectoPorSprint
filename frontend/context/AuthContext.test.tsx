import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, AuthContext } from './AuthContext';
import * as AuthStorage from '../services/authStorage';
import api from '../services/api';

// Mocks
jest.mock('../services/authStorage', () => ({
  saveRefreshToken: jest.fn(),
  getRefreshToken: jest.fn(),
  removeRefreshToken: jest.fn(),
}));

jest.mock('../services/api', () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    __esModule: true,
    default: mockApi,
    setAccessToken: jest.fn(),
    setLogoutCallback: jest.fn(),
  };
});

// Helper component to consume context
const TestComponent = () => {
  const context = React.useContext(AuthContext);
  if (!context) return null;
  return (
    <>
      <Text testID="isAuthenticated">{context.isAuthenticated.toString()}</Text>
      <Text testID="login" onPress={() => context.login({ email: 'test@test.com', password: 'password' })}>
        Login
      </Text>
      <Text testID="logout" onPress={() => context.logout()}>
        Logout
      </Text>
    </>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuthStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);
  });

  it('initializes with unauthenticated state', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('isAuthenticated').props.children).toBe('false');
    });
  });

  it('login updates state and saves token', async () => {
    // Mock API responses
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'bearer',
      },
    });
    
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@test.com',
        is_active: true,
      },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial check
    await waitFor(() => {
       expect(getByTestId('isAuthenticated').props.children).toBe('false');
    });

    // Trigger login
    await act(async () => {
      getByTestId('login').props.onPress();
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
          '/auth/login', 
          expect.anything(), 
          expect.anything()
      );
      expect(AuthStorage.saveRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(getByTestId('isAuthenticated').props.children).toBe('true');
    });
  });

  it('logout clears state and removes token', async () => {
      // Setup as logged in first would be ideal, but for simplicity let's just test logout call
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
  
      await act(async () => {
        getByTestId('logout').props.onPress();
      });
  
      await waitFor(() => {
        expect(AuthStorage.removeRefreshToken).toHaveBeenCalled();
        expect(getByTestId('isAuthenticated').props.children).toBe('false');
      });
  });
});
