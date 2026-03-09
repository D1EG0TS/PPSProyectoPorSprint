export interface Permission {
  id: number;
  name: string;
  description?: string;
  module?: string;
}

export interface User {
  id: number;
  email: string;
  name?: string; // Mapeado a full_name en el backend si es necesario, o unificar
  full_name?: string;
  role?: string; // Para mostrar el nombre del rol (ej: "admin")
  role_id?: number;
  is_active: boolean;
  permissions?: Permission[];
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user?: User; // Optional if backend returns it, otherwise we might need to fetch it
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
