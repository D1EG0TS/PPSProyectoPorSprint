import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../login';
import RegisterScreen from '../register';
import ForgotPasswordScreen from '../forgot-password';
import ResetPasswordScreen from '../reset-password/[token]';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ token: 'test-token' }),
  Link: ({ children, href }: any) => <>{children}</>,
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

describe('Auth Screens', () => {
  const mockLogin = jest.fn();
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      isLoading: false,
      error: null,
    });
  });

  describe('LoginScreen', () => {
    it('renders correctly', () => {
      const { getByText, getByTestId } = render(<LoginScreen />);
      expect(getByText('Iniciar Sesión')).toBeTruthy();
      expect(getByTestId('email-input')).toBeTruthy();
      expect(getByTestId('password-input')).toBeTruthy();
    });

    it('shows validation errors for empty fields', async () => {
      const { getByTestId, findByText } = render(<LoginScreen />);
      
      fireEvent.press(getByTestId('login-button'));

      // Wait for validation error
      const emailError = await findByText('Email inválido');
      expect(emailError).toBeTruthy();
    });

    it('calls login with correct data', async () => {
      const { getByTestId } = render(<LoginScreen />);
      
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'password123');
      fireEvent.press(getByTestId('login-button'));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('RegisterScreen', () => {
    it('validates password match', async () => {
      const { getByTestId, findByText } = render(<RegisterScreen />);
      
      fireEvent.changeText(getByTestId('fullname-input'), 'Test User');
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'password123');
      fireEvent.changeText(getByTestId('confirm-input'), 'different');
      
      fireEvent.press(getByTestId('register-button'));

      const error = await findByText('Las contraseñas no coinciden');
      expect(error).toBeTruthy();
    });

    it('calls register on valid submission', async () => {
      const { getByTestId } = render(<RegisterScreen />);
      
      fireEvent.changeText(getByTestId('fullname-input'), 'Test User');
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.changeText(getByTestId('password-input'), 'password123');
      fireEvent.changeText(getByTestId('confirm-input'), 'password123');
      
      fireEvent.press(getByTestId('register-button'));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          'test@example.com',
          'password123',
          'Test User'
        );
      });
    });
  });

  describe('ForgotPasswordScreen', () => {
    it('calls api to send reset email', async () => {
      const { getByTestId } = render(<ForgotPasswordScreen />);
      
      fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
          email: 'test@example.com',
        });
      });
    });
  });

  describe('ResetPasswordScreen', () => {
    it('calls api to reset password', async () => {
      const { getByTestId } = render(<ResetPasswordScreen />);
      
      fireEvent.changeText(getByTestId('password-input'), 'newpassword');
      fireEvent.changeText(getByTestId('confirm-input'), 'newpassword');
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
          token: 'test-token',
          new_password: 'newpassword',
        });
      });
    });
  });
});
