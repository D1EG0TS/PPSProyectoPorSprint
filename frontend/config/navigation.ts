import { USER_ROLES } from '../constants/roles';

export interface NavigationItem {
  label: string;
  path?: string;
  icon: string;
  allowedRoles: number[];
  allowedPermissions?: string[];
  children?: NavigationItem[];
}

export const SIDEBAR_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/(dashboard)',
    icon: 'view-dashboard',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE, USER_ROLES.VISITOR],
  },
  {
    label: 'Catálogo Público',
    path: '/(visitor)/catalog',
    icon: 'store',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE, USER_ROLES.VISITOR],
  },
  {
    label: 'Gestión Integral',
    icon: 'package-variant-closed',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
    children: [
      {
        label: 'Inventario',
        path: '/(dashboard)/admin/inventory',
        icon: 'view-grid-plus',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
      },
      {
        label: 'Trazabilidad',
        path: '/(dashboard)/admin/traceability',
        icon: 'map-marker-path',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
      },
      {
        label: 'Ubicaciones',
        path: '/(dashboard)/admin/locations',
        icon: 'map-marker-multiple',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
      },
      {
        label: 'Movimientos',
        path: '/(dashboard)/admin/movements',
        icon: 'swap-horizontal-bold',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
      },
      {
        label: 'Almacenes',
        path: '/(dashboard)/admin/warehouses',
        icon: 'warehouse',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['warehouses:view'],
      },
    ]
  },
  {
    label: 'Catálogo Operativo',
    path: '/(dashboard)/operator/catalog/operational',
    icon: 'cart-outline',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE],
  },
  {
    label: 'Catálogo Interno',
    path: '/(dashboard)/moderator/catalog/internal',
    icon: 'table-large',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
    allowedPermissions: ['catalog_internal:view'],
  },
  {
    label: 'Dashboard Stock',
    path: '/(dashboard)/moderator/catalog/dashboard',
    icon: 'chart-box-outline',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
    allowedPermissions: ['stock_dashboard:view'],
  },
  {
    label: 'Inventario',
    icon: 'package-variant',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
    children: [
      {
        label: 'Dashboard Activos',
        path: '/(dashboard)/assets/dashboard',
        icon: 'chart-bar',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['assets:view'],
      },
      {
        label: 'Inventario Activos',
        path: '/(dashboard)/assets/inventory',
        icon: 'format-list-bulleted',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE],
        allowedPermissions: ['assets:view'],
      },
      {
        label: 'Gestión Productos',
        path: '/(dashboard)/admin/products',
        icon: 'archive-edit',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['inventory:view'],
      },
      {
        label: 'Herramientas',
        path: '/(dashboard)/admin/tools',
        icon: 'tools',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['inventory:view'],
      },
    ]
  },
  {
    label: 'Solicitudes',
    icon: 'file-document-multiple',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE],
    children: [
      {
        label: 'Nueva Solicitud',
        path: '/(dashboard)/operator/requests/create',
        icon: 'file-document-edit',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE],
      },
      {
        label: 'Aprobaciones',
        path: '/(dashboard)/moderator/requests/pending',
        icon: 'check-decagram',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['requests:approve'],
      },
    ]
  },
  {
    label: 'Vehículos',
    icon: 'car',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
    children: [
      {
        label: 'Lista Vehículos',
        path: '/(dashboard)/admin/vehicles',
        icon: 'car-side',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['vehicles:view'],
      },
      {
        label: 'Validación Docs',
        path: '/(dashboard)/moderator/vehicles/pending-validation',
        icon: 'file-document-check',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['vehicles:manage'],
      },
    ]
  },
  {
    label: 'Seguridad (EPP)',
    icon: 'shield-account',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE],
    children: [
      {
        label: 'Mis EPP',
        path: '/(dashboard)/operator/epp',
        icon: 'hard-hat',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE],
      },
      {
        label: 'Dashboard EPP',
        path: '/(dashboard)/moderator/dashboard/epp',
        icon: 'chart-bar',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['epp:moderate'],
      },
      {
        label: 'Inspecciones',
        path: '/(dashboard)/moderator/epp/inspections',
        icon: 'clipboard-check',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['epp:moderate'],
      },
      {
        label: 'Gestión EPP',
        path: '/(dashboard)/admin/epp',
        icon: 'cog-transfer',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
      },
    ]
  },
  {
    label: 'Reportes',
    icon: 'chart-bar-stacked',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
    children: [
      {
        label: 'Reportes Inventario',
        path: '/(dashboard)/admin/reports',
        icon: 'file-chart',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
        allowedPermissions: ['reports:view'],
      },
    ]
  },
  {
    label: 'Administración',
    icon: 'cog',
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
    children: [
      {
        label: 'Usuarios',
        path: '/(dashboard)/admin/users',
        icon: 'account-group',
        allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
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
      {
        label: 'Configuración',
        path: '/(dashboard)/settings',
        icon: 'cog-outline',
        allowedRoles: [USER_ROLES.SUPER_ADMIN],
      },
    ]
  },
];

export const PROTECTED_ROUTES: Record<string, number[]> = {
  '/(visitor)/catalog/public': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE, USER_ROLES.VISITOR],
  '/(visitor)/catalog': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE, USER_ROLES.VISITOR],
  '/(visitor)/catalog/[id]': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE, USER_ROLES.VISITOR],
  '/(dashboard)/admin/inventory': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/admin/traceability': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/admin/locations': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/admin/movements': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/admin/reports': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/users': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/admin/users': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/inventory': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/admin/tools': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/admin/warehouses': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/settings': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/reports': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/superadmin/metrics': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/superadmin/config': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/superadmin/logs': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/superadmin/backup': [USER_ROLES.SUPER_ADMIN],
  '/(dashboard)/operator/requests/create': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE],
  '/(dashboard)/moderator/requests/pending': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/moderator/requests/[id]': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/admin/epp': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
  '/(dashboard)/moderator/epp/inspections': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/moderator/dashboard/epp': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/operator/epp': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.OPERATIVE],
  '/(dashboard)/admin/vehicles': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/admin/vehicles/[id]': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  '/(dashboard)/moderator/vehicles/pending-validation': [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
};
