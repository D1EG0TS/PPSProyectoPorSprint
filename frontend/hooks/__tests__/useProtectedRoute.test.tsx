import { renderHook } from '@testing-library/react-native';
import { useProtectedRoute } from '../useProtectedRoute';
import { useAuth } from '../useAuth';
import { useRouter, useSegments } from 'expo-router';
import { USER_ROLES } from '../../constants/roles';

// Mock everything
jest.mock('../useAuth');
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useSegments: jest.fn(),
}));
jest.mock('../../config/navigation', () => ({
    PROTECTED_ROUTES: {
        '/(dashboard)/admin': [1, 2], // Admin only
        '/(dashboard)/user': [1, 2, 3, 4], // Logged in users
    }
}));

describe('useProtectedRoute', () => {
  const mockReplace = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
  });

  it('does nothing while loading', () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: true });
    renderHook(() => useProtectedRoute());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to login if not authenticated and not in auth group', () => {
    (useAuth as jest.Mock).mockReturnValue({ 
        isLoading: false, 
        isAuthenticated: false, 
        user: null 
    });
    (useSegments as jest.Mock).mockReturnValue(['(dashboard)']);
    
    renderHook(() => useProtectedRoute());
    
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('redirects to home if authenticated and in auth group (non-guest)', () => {
    (useAuth as jest.Mock).mockReturnValue({ 
        isLoading: false, 
        isAuthenticated: true, 
        user: { role_id: USER_ROLES.ADMIN } 
    });
    (useSegments as jest.Mock).mockReturnValue(['(auth)', 'login']);
    
    renderHook(() => useProtectedRoute());
    
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('redirects to catalog if authenticated guest in auth group', () => {
     (useAuth as jest.Mock).mockReturnValue({ 
        isLoading: false, 
        isAuthenticated: true, 
        user: { role_id: USER_ROLES.GUEST } 
    });
    (useSegments as jest.Mock).mockReturnValue(['(auth)', 'login']);
    
    renderHook(() => useProtectedRoute());
    
    expect(mockReplace).toHaveBeenCalledWith('/(visitor)/catalog');
  });

  it('redirects to catalog if authenticated guest at root', () => {
     (useAuth as jest.Mock).mockReturnValue({ 
        isLoading: false, 
        isAuthenticated: true, 
        user: { role_id: USER_ROLES.GUEST } 
    });
    (useSegments as jest.Mock).mockReturnValue([]); // root
    
    renderHook(() => useProtectedRoute());
    
    expect(mockReplace).toHaveBeenCalledWith('/(visitor)/catalog');
  });

  it('redirects to home if user lacks permission for route', () => {
    (useAuth as jest.Mock).mockReturnValue({ 
        isLoading: false, 
        isAuthenticated: true, 
        user: { role_id: USER_ROLES.USER } // Role 4
    });
    // Protected route requires 1 or 2
    (useSegments as jest.Mock).mockReturnValue(['(dashboard)', 'admin']);
    
    renderHook(() => useProtectedRoute());
    
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('allows access if user has permission', () => {
     (useAuth as jest.Mock).mockReturnValue({ 
        isLoading: false, 
        isAuthenticated: true, 
        user: { role_id: USER_ROLES.ADMIN } // Role 2
    });
    // Protected route requires 1 or 2
    (useSegments as jest.Mock).mockReturnValue(['(dashboard)', 'admin']);
    
    renderHook(() => useProtectedRoute());
    
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
