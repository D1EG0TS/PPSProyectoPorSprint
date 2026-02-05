import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './useAuth';
import { PROTECTED_ROUTES } from '../config/navigation';
import { USER_ROLES } from '../constants/roles';

export const useProtectedRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (user?.role_id === USER_ROLES.GUEST) {
        router.replace('/(visitor)/catalog');
      } else {
        router.replace('/');
      }
    } else if (isAuthenticated && user?.role_id) {
        // Construct path from segments to match config
        // e.g., ['(dashboard)', 'users'] -> '/(dashboard)/users'
        const currentPath = '/' + segments.join('/');
        
        // Redirect Guest to catalog if they are at root
        if (currentPath === '/' && user.role_id === USER_ROLES.GUEST) {
            router.replace('/(visitor)/catalog');
            return;
        }
        
        // Find matching protected route config
        // Check exact match first, then prefix match
        let requiredRoles = PROTECTED_ROUTES[currentPath];
        
        if (!requiredRoles) {
            // Check for parent routes in config
            const matchingKey = Object.keys(PROTECTED_ROUTES).find(key => 
                currentPath.startsWith(key + '/') || currentPath === key
            );
            if (matchingKey) {
                requiredRoles = PROTECTED_ROUTES[matchingKey];
            }
        }
        
        if (requiredRoles && !requiredRoles.includes(user.role_id)) {
            console.log(`Access denied for user role ${user.role_id} to ${currentPath}`);
            // Prevent infinite loop if already at root or other fallback
            if (currentPath !== '/') {
                router.replace('/');
            }
        }
    }
  }, [isAuthenticated, isLoading, segments, user]);
};
