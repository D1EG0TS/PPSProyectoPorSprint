

import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../constants/roles';

export const usePermission = () => {
  const { user } = useAuth();

  const hasPermission = useCallback((permissionName: string): boolean => {
    if (!user) return false;
    
    // Super Admin and Admin have all permissions
    if (user.role_id === USER_ROLES.SUPER_ADMIN || user.role_id === USER_ROLES.ADMIN) return true;

    // Check granular permissions
    if (user.permissions) {
      return user.permissions.some(p => p.name === permissionName);
    }

    return false;
  }, [user]);

  const hasAnyPermission = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.some(hasPermission);
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.every(hasPermission);
  }, [hasPermission]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    user
  };
};
