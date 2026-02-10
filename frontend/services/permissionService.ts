import api from './api';
import { Permission, User } from '../types/auth';

export const getPermissions = async (): Promise<Permission[]> => {
  const response = await api.get<Permission[]>('/permissions/');
  return response.data;
};

export const updateUserPermissions = async (userId: number, permissionIds: number[]): Promise<User> => {
  const response = await api.put<User>(`/users/${userId}/permissions`, permissionIds);
  return response.data;
};
