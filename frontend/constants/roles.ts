export const USER_ROLES = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MODERATOR: 3,
  OPERATIVE: 4,
  VISITOR: 5,
  USER: 3,
  MANAGER: 2,
  GUEST: 5,
} as const;

export const USER = USER_ROLES.MODERATOR;
export const MANAGER = USER_ROLES.ADMIN;
export const GUEST = USER_ROLES.VISITOR;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const getRoleName = (roleId?: number): string => {
  switch (roleId) {
    case USER_ROLES.SUPER_ADMIN: return 'Super Admin';
    case USER_ROLES.ADMIN: return 'Admin';
    case USER_ROLES.MODERATOR: return 'Moderador';
    case USER_ROLES.OPERATIVE: return 'Operativo';
    case USER_ROLES.VISITOR: return 'Invitado';
    default: return 'Desconocido';
  }
};
