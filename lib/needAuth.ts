import { useAuthStore } from '@/store/auth-store';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

export const DEFAULT_AFTER_LOGIN = '/(tabs)' as const;

/**
 * Evita open-redirect: solo rutas internas relativas.
 */
export function sanitizeReturnPath(next: unknown): string {
  if (typeof next !== 'string') return DEFAULT_AFTER_LOGIN;
  const t = next.trim();
  if (!t.startsWith('/') || t.startsWith('//') || t.includes('://')) {
    return DEFAULT_AFTER_LOGIN;
  }
  return t;
}

export function loginHrefWithNext(returnPath: string): Href {
  const path = sanitizeReturnPath(returnPath);
  return `/login?next=${encodeURIComponent(path)}` as Href;
}

/**
 * Navega al login reemplazando la pantalla actual (sin modales).
 * Tras iniciar sesión, `login` usa el query `next` para volver acá.
 */
export function redirectToLogin(returnPath: string): void {
  router.replace(loginHrefWithNext(returnPath));
}

/**
 * Pantallas que exigen sesión: si ya se restauró AsyncStorage y no hay token,
 * redirige al login. Sin alerts.
 *
 * @param returnPath Ruta a la que volver después del login (ej. `/(tabs)/favorites`)
 * @returns `true` solo cuando hay token y la sesión terminó de inicializar
 */
export function useNeedsAuthScreen(returnPath: string): boolean {
  const token = useAuthStore((s) => s.token);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;
    if (!token) {
      redirectToLogin(returnPath);
    }
  }, [isInitialized, token, returnPath]);

  return isInitialized && !!token;
}
