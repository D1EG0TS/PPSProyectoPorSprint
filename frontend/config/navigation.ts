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
    path: '/(dashboard)/admin/users',
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
    label: 'Herramientas',
    path: '/(dashboard)/admin/tools',
    icon: 'tools',
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
  {
    label: 'Gestión EPP',
    path: '/(dashboard)/admin/epp',
    icon: 'shield-account',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  },
  {
    label: 'Inspecciones EPP',
    path: '/(dashboard)/moderator/epp/inspections',
    icon: 'clipboard-check',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  },
  {
    label: 'Dashboard EPP',
    path: '/(dashboard)/moderator/dashboard/epp',
    icon: 'chart-bar',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  },
  {
    label: 'Mis EPP',
    path: '/(dashboard)/operator/epp',
    icon: 'hard-hat',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.USER],
  },
  {
    label: 'Vehículos',
    path: '/(dashboard)/admin/vehicles',
    icon: 'car',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  },
  {
    label: 'Validación Docs',
    path: '/(dashboard)/moderator/vehicles/pending-validation',
    icon: 'file-document-check',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  },
  {
    label: 'Métricas Sistema',
    path: '/(dashboard)/superadmin/metrics',
    icon: 'server-network',
    allowedRoles: [USER_ROLES.SUPER_ADMIN],
  },
  {
    label: 'Logs Sistema',
    path: '/(dashboard)/superadmin/logs',
    icon: 'history',
    allowedRoles: [USER_ROLES.SUPER_ADMIN],
  },
];

export const PROTECTED_ROUTES: Record<string, number[]> = {
  '/(dashboard)/users': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/admin/users': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/inventory': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  '/(dashboard)/admin/tools': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  '/(dashboard)/admin/warehouses': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/settings': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/reports': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/superadmin/metrics': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/superadmin/config': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/superadmin/logs': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/superadmin/backup': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/operator/requests/create': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.USER],
  '/(dashboard)/moderator/requests/pending': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  '/(dashboard)/moderator/requests/[id]': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  '/(dashboard)/admin/epp': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/moderator/epp/inspections': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  '/(dashboard)/moderator/dashboard/epp': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
  '/(dashboard)/operator/epp': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.USER],
  '/(dashboard)/admin/vehicles': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/admin/vehicles/[id]': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/moderator/vehicles/pending-validation': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER],
};
