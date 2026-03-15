import { API_BASE_URL } from '@/constants/api';

interface RequestOptions {
  method?: string;
  body?: object;
  token?: string | null;
}

/**
 * Wrapper de fetch para el backend.
 * Lanza un Error con el mensaje del backend si la respuesta no es 2xx.
 */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? 'Error en la solicitud');
  }

  return data as T;
}

// ── Trails ────────────────────────────────────────────────────────────────────

export interface BackendTrail {
  id: string;
  slug: string;
  name: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  route_type: 'circular' | 'lineal' | 'ida_vuelta';
  region: string | null;
  distance_km: number | null;
  elevation_gain: number | null;
  elevation_loss: number | null;
  max_altitude: number | null;
  min_altitude: number | null;
  duration_minutes: number | null;
  is_featured: boolean;
  is_premium: boolean;
  status_id: number | null;
  description: string | null;
  map_point: { latitude: number; longitude: number } | null;
  thumbnail_url: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface TrailsResponse {
  trails: BackendTrail[];
  total: number;
  limit: number;
  offset: number;
}

export interface FetchTrailsParams {
  limit?: number;
  offset?: number;
  is_featured?: boolean;
  difficulty?: string;
  status_id?: number;
}

export async function fetchTrails(params: FetchTrailsParams = {}): Promise<TrailsResponse> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  if (params.is_featured !== undefined) qs.set('is_featured', String(params.is_featured));
  if (params.difficulty) qs.set('difficulty', params.difficulty);
  if (params.status_id !== undefined) qs.set('status_id', String(params.status_id));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<TrailsResponse>(`/trails${query}`);
}
