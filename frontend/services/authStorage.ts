import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'auth_refresh_token';

// SecureStore is not supported on web, use localStorage instead
const isWeb = Platform.OS === 'web';

export const saveRefreshToken = async (token: string) => {
  if (isWeb) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  if (isWeb) {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } else {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }
};

export const removeRefreshToken = async () => {
  if (isWeb) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
};
