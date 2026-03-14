import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '@/services/api';

const TOKEN_KEY = 'auth_token';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  language: string;
  is_admin: boolean;
  is_premium: boolean;
  email_verified?: boolean;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  /** true cuando ya se intentó recuperar el token de AsyncStorage */
  isInitialized: boolean;

  /** Llamar al inicio de la app para restaurar la sesión guardada */
  initialize: () => Promise<void>;

  /** Login con email y contraseña → /auth/login-app */
  login: (email: string, password: string) => Promise<void>;

  /**
   * Registro con correo → /auth/register
   * Devuelve el mensaje de éxito del servidor (pide verificar email).
   */
  register: (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{ message: string }>;

  /** Elimina token y limpia el estado */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        const data = await apiRequest<{ user: User }>('/auth/me-app', { token });
        set({ token, user: data.user, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      // Token inválido o vencido → limpiar
      await AsyncStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{ token: string; user: User }>('/auth/login-app', {
        method: 'POST',
        body: { email, password },
      });
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      set({ token: data.token, user: data.user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (fullName, email, password, confirmPassword) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{ message: string }>('/auth/register', {
        method: 'POST',
        body: {
          full_name: fullName,
          email,
          password,
          confirm_password: confirmPassword,
        },
      });
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null });
  },
}));
