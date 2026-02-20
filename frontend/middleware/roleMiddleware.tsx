import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES } from '../constants/roles';

/**
 * Hook to enforce role-based access control.
 * Redirects unauthorized users.
 */
export const useRoleMiddleware = (allowedRoles: number[]) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated, let auth guard handle it (or redirect to login)
    if (!isAuthenticated) return;

    if (!user) return;

    // 1. Redirect Role 5 (Guest) trying to access internal routes
    // Internal routes are usually under (dashboard), (moderator), (operator), (admin)
    // We check segments for these keywords
    const path = segments.join('/');
    const isInternalRoute = 
        path.includes('(dashboard)') || 
        path.includes('(moderator)') || 
        path.includes('(operator)') || 
        path.includes('(admin)');

    if (user.role_id === USER_ROLES.GUEST && isInternalRoute) {
      console.log('Middleware: Redirecting Guest from internal route');
      router.replace('/(visitor)/catalog/public');
      return;
    }

    // 2. Check specific allowed roles for the component/screen using this hook
    if (allowedRoles.length > 0) {
        if (user.role_id === undefined || !allowedRoles.includes(user.role_id)) {
            console.log(`Middleware: Access denied for role ${user.role_id}`);
            if (user.role_id === USER_ROLES.GUEST) {
                router.replace('/(visitor)/catalog/public');
            } else {
                router.replace('/(dashboard)'); // Default for logged in users
            }
        }
    }

  }, [user, isAuthenticated, isLoading, segments]);

  return { 
    isAuthorized: !!(user?.role_id !== undefined && allowedRoles.includes(user.role_id)),
    user 
  };
};

/**
 * Component Wrapper to conditionally render content based on role.
 * Does NOT redirect, just hides content.
 */
interface RoleGuardProps {
    allowedRoles: number[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, fallback = null }) => {
    const { user } = useAuth();

    if (user?.role_id === undefined || !allowedRoles.includes(user.role_id)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
