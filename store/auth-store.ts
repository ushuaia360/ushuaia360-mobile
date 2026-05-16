import { useActiveTrailSessionStore } from '@/store/active-trail-session-store';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiHttpError, apiRequest } from '@/services/api';

const TOKEN_KEY = 'auth_token';
const USER_CACHE_KEY = 'auth_user_cache_v1';

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

  /** POST /auth/verify-email */
  verifyEmail: (token: string) => Promise<{ message: string }>;

  /** POST /auth/resend-verification */
  resendVerification: (email: string) => Promise<{ message: string }>;

  /** POST /auth/forgot-password */
  forgotPassword: (email: string) => Promise<{ message: string }>;

  /** POST /auth/change-password (flujo recuperación) */
  resetPassword: (resetToken: string, newPassword: string) => Promise<{ message: string }>;

  /** Recarga el usuario desde el servidor (para reflejar cambios de premium) */
  refreshUser: () => Promise<void>;

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
      if (!token) {
        await useActiveTrailSessionStore.getState().clearSession();
        set({ isInitialized: true });
        return;
      }
      try {
        const data = await apiRequest<{ user: User }>('/auth/me-app', { token });
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
        set({ token, user: data.user, isInitialized: true });
      } catch (err) {
        const unauthorized =
          err instanceof ApiHttpError && (err.status === 401 || err.status === 403);
        if (unauthorized) {
          await AsyncStorage.removeItem(TOKEN_KEY);
          await AsyncStorage.removeItem(USER_CACHE_KEY);
          await useActiveTrailSessionStore.getState().clearSession();
          set({ token: null, user: null, isInitialized: true });
          return;
        }
        const rawUser = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (rawUser) {
          try {
            const user = JSON.parse(rawUser) as User;
            set({ token, user, isInitialized: true });
            return;
          } catch {
            await AsyncStorage.removeItem(USER_CACHE_KEY);
          }
        }
        set({ token, user: null, isInitialized: true });
      }
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_CACHE_KEY);
      await useActiveTrailSessionStore.getState().clearSession();
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
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
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

  verifyEmail: async (token) => {
    return apiRequest<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  },

  resendVerification: async (email) => {
    return apiRequest<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    });
  },

  forgotPassword: async (email) => {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  resetPassword: async (resetToken, newPassword) => {
    return apiRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: { reset_token: resetToken, new_password: newPassword },
    });
  },

  refreshUser: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const data = await apiRequest<{ user: User }>('/auth/me-app', { token });
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
      set({ user: data.user });
    } catch {
      // ignorar errores de red; el usuario no cambia
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_CACHE_KEY);
    await useActiveTrailSessionStore.getState().clearSession();
    set({ token: null, user: null });
  },
}));
