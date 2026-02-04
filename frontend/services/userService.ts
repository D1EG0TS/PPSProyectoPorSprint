import api from './api';

export interface User {
  id: number;
  email: string;
  full_name?: string;
  role_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role_id: number;
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  role_id?: number;
  is_active?: boolean;
  password?: string;
}

const userService = {
  getUsers: async (params?: { skip?: number; limit?: number; search?: string }) => {
    const response = await api.get<User[]>('/users/', { params });
    return response.data;
  },

  getUser: async (id: number) => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserData) => {
    const response = await api.post<User>('/users/', data);
    return response.data;
  },

  updateUser: async (id: number, data: UpdateUserData) => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: number) => {
    const response = await api.delete<User>(`/users/${id}`);
    return response.data;
  },

  resetPassword: async (id: number, password: string) => {
    const response = await api.post(`/users/${id}/reset-password`, { password });
    return response.data;
  }
};

export default userService;
