export const USER_ROLES = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  USER: 4,
  GUEST: 5,
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const getRoleName = (roleId?: number): string => {
  switch (roleId) {
    case USER_ROLES.SUPER_ADMIN: return 'Super Admin';
    case USER_ROLES.ADMIN: return 'Admin';
    case USER_ROLES.MANAGER: return 'Manager';
    case USER_ROLES.USER: return 'Usuario';
    case USER_ROLES.GUEST: return 'Invitado';
    default: return 'Desconocido';
  }
};
