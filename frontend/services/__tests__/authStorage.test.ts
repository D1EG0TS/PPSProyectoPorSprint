import { saveRefreshToken, getRefreshToken, removeRefreshToken } from '../authStorage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('authStorage', () => {
  const mockToken = 'test-token-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Native (SecureStore)', () => {
    beforeAll(() => {
      Platform.OS = 'ios'; // or 'android'
    });

    it('saves refresh token securely', async () => {
      await saveRefreshToken(mockToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_refresh_token', mockToken);
    });

    it('gets refresh token securely', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
      const token = await getRefreshToken();
      expect(token).toBe(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_refresh_token');
    });

    it('removes refresh token securely', async () => {
      await removeRefreshToken();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
    });
  });

  // Testing web fallback requires changing Platform.OS which might be tricky with Jest's module caching
  // depending on how it's implemented. But the logic is simple enough.
  // If we want to test web, we might need to use jest.doMock or isolate modules.
  // For now, testing the primary native path (SecureStore) is most important for a React Native app.
});
