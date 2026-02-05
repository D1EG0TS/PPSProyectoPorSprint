import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as AuthStorage from '../services/authStorage';
import api, { setAccessToken, setLogoutCallback } from '../services/api';
import { User, LoginCredentials, RegisterData, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const setUser = (user: User | null) => {
    setAuthState((prev) => ({
      ...prev,
      user,
      isAuthenticated: !!user,
      isLoading: false,
      error: null,
    }));
  };

  const setLoading = (isLoading: boolean) => {
    setAuthState((prev) => ({ ...prev, isLoading }));
  };

  const setError = (error: string | null) => {
    setAuthState((prev) => ({ ...prev, error, isLoading: false }));
  };

  // Logout function
  const logout = async () => {
    try {
      // Optional: Call backend to revoke token
      const refreshToken = await AuthStorage.getRefreshToken();
      if (refreshToken) {
        try {
            await api.post('/auth/logout', { refresh_token: refreshToken });
        } catch (e) {
            // Ignore logout errors (e.g. token already expired)
        }
      }
    } catch (e) {
      console.log('Logout error:', e);
    } finally {
      await AuthStorage.removeRefreshToken();
      setAccessToken(null);
      setUser(null);
    }
  };

  // Register logout callback in api service
  useEffect(() => {
    setLogoutCallback(logout);
  }, []);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshToken = await AuthStorage.getRefreshToken();
        
        if (!refreshToken) {
          setLoading(false);
          return;
        }

        // Try to refresh token
        const response = await api.post('/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;
        
        setAccessToken(access_token);
        if (newRefreshToken) {
          await AuthStorage.saveRefreshToken(newRefreshToken);
        }

        // Fetch user details
        const userResponse = await api.get('/auth/me');
        setUser(userResponse.data);

      } catch (error) {
        console.log('Failed to restore session:', error);
        await logout();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
        // Login request (needs x-www-form-urlencoded for OAuth2PasswordRequestForm usually, 
        // but let's check backend implementation. 
        // Backend uses OAuth2PasswordRequestForm which expects form data, NOT JSON.
        
        const formData = new FormData();
        formData.append('username', credentials.email);
        formData.append('password', credentials.password);
        
        // Note: Axios might send as multipart/form-data or application/x-www-form-urlencoded
        // OAuth2PasswordRequestForm usually handles Form Data. 
        // Let's use URLSearchParams to ensure x-www-form-urlencoded which is standard for OAuth2
        const params = new URLSearchParams();
        params.append('username', credentials.email);
        params.append('password', credentials.password);

        const response = await api.post('/auth/login', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token } = response.data;

        setAccessToken(access_token);
        await AuthStorage.saveRefreshToken(refresh_token);

        // Fetch user
        const userResponse = await api.get('/auth/me');
        setUser(userResponse.data);

    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      const msg = error.response?.data?.detail || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (data: RegisterData) => {
    setLoading(true);
    try {
      await api.post('/auth/register', data);
      
      // Auto login after register
      await login({
        email: data.email,
        password: data.password,
      });
    } catch (error: any) {
      console.error('Register error:', error.response?.data || error.message);
      const msg = error.response?.data?.detail || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const contextValue = React.useMemo(() => ({
    ...authState,
    login,
    register,
    logout,
  }), [authState, login, register, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
