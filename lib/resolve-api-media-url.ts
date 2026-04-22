import { API_BASE_URL } from '@/constants/api';

/**
 * Asegura URL absoluta para imágenes del API. Si el backend devuelve rutas relativas
 * (`/uploads/...`), las resuelve contra el origen del host (sin el sufijo `/api/v1`).
 */
export function resolveApiMediaUrl(path: string | null | undefined): string | null {
  if (path == null) return null;
  const t = String(path).trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  if (t.startsWith('/')) return `${origin}${t}`;
  return `${origin}/${t}`;
}
