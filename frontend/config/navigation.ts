import { USER_ROLES } from '../constants/roles';

export interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  allowedRoles: number[];
}

export const SIDEBAR_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/(dashboard)', // Points to index of dashboard group
    icon: 'view-dashboard',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.USER, USER_ROLES.GUEST],
  },
  {
    label: 'Usuarios',
    path: '/(dashboard)/users',
    icon: 'account-group',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  },
  {
    label: 'Inventario',
    path: '/(dashboard)/inventory',
    icon: 'package-variant',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  },
  {
    label: 'Almacenes',
    path: '/(dashboard)/admin/warehouses',
    icon: 'warehouse',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  },
  {
    label: 'Configuración',
    path: '/(dashboard)/settings',
    icon: 'cog',
    allowedRoles: [USER_ROLES.SUPER_ADMIN],
  },
  {
    label: 'Nueva Solicitud',
    path: '/(dashboard)/operator/requests/create',
    icon: 'file-document-edit',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.USER],
  },
  {
    label: 'Aprobaciones',
    path: '/(dashboard)/moderator/requests/pending',
    icon: 'check-decagram',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  },
];

export const PROTECTED_ROUTES: Record<string, number[]> = {
  '/(dashboard)/users': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/inventory': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  '/(dashboard)/admin/warehouses': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/settings': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/reports': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/operator/requests/create': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.USER],
  '/(dashboard)/moderator/requests/pending': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  '/(dashboard)/moderator/requests/[id]': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
};
