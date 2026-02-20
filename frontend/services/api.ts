import axios from 'axios';
import * as AuthStorage from './authStorage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  // Prefer localhost on web to avoid Windows firewall blocking host IP
  if (Platform.OS === 'web') {
    const hostname =
      (typeof window !== 'undefined' && window.location?.hostname) || 'localhost';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    if (process.env.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
    const protocol =
      (typeof window !== 'undefined' && window.location?.protocol) || 'http:';
    return `${protocol}//${hostname}:8000`;
  }

  // Native (Android/iOS): use env var if set (e.g., tunnel or LAN IP)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Use hostUri for dev environment on mobile devices
  const debuggerHost = Constants.expoConfig?.hostUri;
  const devHost = debuggerHost?.split(':')[0];

  if (devHost) {
    return `http://${devHost}:8000`;
  }

  // Fallback
  return 'http://localhost:8000';
}

const API_URL = getBaseUrl();
console.log('API URL configured as:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken: string | null = null;
let logoutCallback: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setLogoutCallback = (callback: () => void) => {
  logoutCallback = callback;
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // Bypass localtunnel reminder
    config.headers['bypass-tunnel-reminder'] = 'true';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error('[API Error]', {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        status: error.response?.status,
        data: error.response?.data
    });
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AuthStorage.getRefreshToken();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint
        // Note: We use axios directly here to avoid interceptors loop if this fails
        // But we need the baseURL
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;

        // Update tokens
        setAccessToken(access_token);
        if (newRefreshToken) {
            await AuthStorage.saveRefreshToken(newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed, logout user
        if (logoutCallback) {
          logoutCallback();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
