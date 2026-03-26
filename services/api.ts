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

/** Segmento de ruta: path como [lat, lng] por el backend */
export interface TrailRouteSegment {
  id: string;
  route_id: string;
  segment_order: number;
  distance_km: number | null;
  path: [number, number][];
}

export interface TrailPointMedia {
  id: string;
  trail_point_id?: string;
  media_type: string;
  url: string;
  thumbnail_url: string | null;
  order_index: number | null;
  created_at?: string;
}

export interface TrailPointDetail {
  id: string;
  trail_id: string;
  name: string | null;
  description: string | null;
  type: string | null;
  km_marker: number | null;
  order_index: number | null;
  location: { latitude: number; longitude: number; elevation?: number } | null;
  media: TrailPointMedia[];
}

export interface TrailActiveRoute {
  id: string;
  trail_id: string;
  version: number;
  is_active: boolean;
  total_distance_km: number | null;
  elevation_gain: number | null;
  elevation_loss: number | null;
}

/** Respuesta de GET /trails/:id (incluye ruta y puntos) */
export interface TrailDetail extends BackendTrail {
  route: TrailActiveRoute | null;
  route_segments: TrailRouteSegment[];
  points: TrailPointDetail[];
}

export async function fetchTrailById(trailId: string): Promise<TrailDetail> {
  const data = await apiRequest<{ trail: TrailDetail }>(`/trails/${trailId}`);
  return data.trail;
}

// ── Favoritos (senderos) ──────────────────────────────────────────────────────

export async function fetchFavoriteTrailIds(token: string): Promise<string[]> {
  const data = await apiRequest<{ trail_ids: string[] }>('/me/favorite-trails/ids', {
    token,
  });
  return data.trail_ids ?? [];
}

export async function fetchFavoriteTrails(token: string): Promise<TrailsResponse> {
  return apiRequest<TrailsResponse>('/me/favorite-trails', { token });
}

export async function addTrailFavorite(token: string, trailId: string): Promise<void> {
  await apiRequest(`/me/favorite-trails/${trailId}`, { method: 'POST', token });
}

export async function removeTrailFavorite(token: string, trailId: string): Promise<void> {
  await apiRequest(`/me/favorite-trails/${trailId}`, { method: 'DELETE', token });
}

export interface ProfileStatsResponse {
  completed_trails_count: number;
  reviews_count: number;
  favorites_count: number;
}

export async function fetchProfileStats(token: string): Promise<ProfileStatsResponse> {
  return apiRequest<ProfileStatsResponse>('/me/profile-stats', { token });
}

// ── Mapa ──────────────────────────────────────────────────────────────────────

export interface MapMarkerTrail {
  kind: 'trail';
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  difficulty: 'easy' | 'medium' | 'hard';
  route_type?: 'circular' | 'lineal' | 'ida_vuelta' | null;
  region?: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  elevation_gain?: number | null;
  description?: string | null;
  thumbnail_url: string | null;
}

export interface MapMarkerPlace {
  kind: 'place';
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string | null;
  region: string | null;
  description: string | null;
  thumbnail_url: string | null;
}

export type MapMarker = MapMarkerTrail | MapMarkerPlace;

export async function fetchMapMarkers(): Promise<MapMarker[]> {
  const data = await apiRequest<{ markers: MapMarker[] }>('/map/markers');
  return data.markers ?? [];
}

export interface BackendPlace {
  id: string;
  slug: string;
  name: string | null;
  category: string | null;
  region: string | null;
  country: string | null;
  description: string | null;
  is_premium: boolean;
  latitude: number | null;
  longitude: number | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

export async function fetchPlace(placeId: string): Promise<BackendPlace> {
  const data = await apiRequest<{ place: BackendPlace }>(`/places/${placeId}`);
  return data.place;
}
