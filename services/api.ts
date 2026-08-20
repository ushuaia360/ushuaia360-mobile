import { API_BASE_URL } from '@/constants/api';
import { logRecorridoTimer } from '@/lib/recorrido-timer-debug';
import { REVIEW_GALLERY_MAX_PHOTOS } from '@/lib/review-constants';

interface RequestOptions {
  method?: string;
  body?: object;
  token?: string | null;
}

/** Error HTTP del API con código de estado (p. ej. 404 Not found). */
export class ApiHttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Con internet muy lento `fetch` puede tardar minutos en fallar (no hay timeout nativo);
 * esto dejaba la splash screen colgada esperando `/auth/me-app` en `authStore.initialize()`.
 */
const REQUEST_TIMEOUT_MS = 10_000;

function parseJsonOrEmpty(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text) as unknown;
    return v != null && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Milis UTC aproximados del servidor según cabecera HTTP `Date` (si viene y es válida). */
export function parseHttpDateHeaderMs(res: Response): number | null {
  const raw = res.headers.get('date');
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Igual que `apiRequest`, pero expone la hora del servidor para sincronizar cronómetros
 * cuando el reloj del dispositivo va desfasado respecto a `started_at`.
 */
export async function apiRequestWithServerTime<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<{ data: T; serverNowMs: number | null }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const serverNowMs = parseHttpDateHeaderMs(res);

  const raw = await res.text();
  const data = raw ? parseJsonOrEmpty(raw) : {};

  if (!res.ok) {
    const msg =
      (typeof data.error === 'string' && data.error) ||
      (typeof data.message === 'string' && data.message) ||
      res.statusText ||
      'Error en la solicitud';
    throw new ApiHttpError(res.status, msg, data);
  }

  return { data: data as T, serverNowMs };
}

/**
 * Wrapper de fetch para el backend.
 * Lanza `ApiHttpError` si la respuesta no es 2xx.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { data } = await apiRequestWithServerTime<T>(path, options);
  return data;
}

export type SearchSuggestionType = 'trail' | 'place';

export type SearchSuggestion = {
  type: SearchSuggestionType;
  id: string;
  slug?: string | null;
  name: string;
  region?: string | null;
  category?: string | null;
  country?: string | null;
  thumbnail_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  duration_minutes?: number | null;
  elevation_gain?: number | null;
};

export async function fetchSearchSuggestions(
  query: string,
  {
    limit = 10,
    types = ['trail', 'place'],
  }: { limit?: number; types?: SearchSuggestionType[] } = {},
): Promise<SearchSuggestion[]> {
  const q = String(query ?? '').trim();
  const safeLimit = Math.min(Math.max(limit || 10, 1), 20);
  const safeTypes = (types ?? []).filter((t) => t === 'trail' || t === 'place');
  const typesParam = safeTypes.length ? safeTypes.join(',') : 'trail,place';
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('limit', String(safeLimit));
  params.set('types', typesParam);
  const res = await apiRequest<{ suggestions?: SearchSuggestion[] }>(`/search/suggest?${params.toString()}`);
  return Array.isArray(res?.suggestions) ? res.suggestions : [];
}

/**
 * Petición mínima para leer la cabecera `Date` y estimar offset servidor–dispositivo.
 */
export async function fetchApproximateServerTimeMs(token?: string | null): Promise<number | null> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_BASE_URL}/trails?limit=1`, { headers });
    const fromHeader = parseHttpDateHeaderMs(res);
    const raw = await res.text();
    let fromBody: number | null = null;
    try {
      const j = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      if (j && typeof j.server_now_ms === 'number' && Number.isFinite(j.server_now_ms)) {
        fromBody = j.server_now_ms;
      }
    } catch {
      /* ignore */
    }
    const chosen = fromBody ?? fromHeader;
    if (__DEV__) {
      logRecorridoTimer('fetchApproximateServerTimeMs', { fromBody, fromHeader, chosen });
    }
    return chosen;
  } catch {
    return null;
  }
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
  contact_link: string | null;
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

export interface TrailEmergencyPointDetail {
  id: string;
  trail_id: string;
  name: string;
  description: string | null;
  phone: string;
  order_index: number | null;
  location: { latitude: number; longitude: number; elevation?: number } | null;
}

/** Respuesta de GET /trails/:id (incluye ruta y puntos) */
export interface TrailDetail extends BackendTrail {
  /** Fotos del sendero (sin punto asociado); incluye `media_type` p. ej. photo_360 */
  media?: TrailPointMedia[];
  route: TrailActiveRoute | null;
  route_segments: TrailRouteSegment[];
  points: TrailPointDetail[];
  emergency_points?: TrailEmergencyPointDetail[];
}

export async function fetchTrailById(trailId: string): Promise<TrailDetail> {
  const data = await apiRequest<{ trail: TrailDetail }>(`/trails/${trailId}`);
  return data.trail;
}

export interface TrailReview {
  id: string;
  trail_id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  rating: number;
  comment: string;
  image_urls?: string[];
  created_at: string;
}



export interface TrailReviewsResponse {
  reviews: TrailReview[];
  total: number;
  limit: number;
  offset: number;
  average_rating: number;
  rating_counts: {
    one_star: number;
    two_star: number;
    three_star: number;
    four_star: number;
    five_star: number;
  };

}

export interface CreateTrailReviewBody {
  rating: number;
  comment: string;
  image_urls?: string[];
}

export interface CreateTrailReviewResponse {
  message: string;
  review: TrailReview;
}

export async function fetchTrailReviews(
  trailId: string,
  limit = 20,
  offset = 0,
): Promise<TrailReviewsResponse> {
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('offset', String(offset));
  return apiRequest<TrailReviewsResponse>(`/trails/${trailId}/reviews?${qs.toString()}`);
}

export async function createTrailReview(
  trailId: string,
  token: string,
  body: CreateTrailReviewBody,
): Promise<CreateTrailReviewResponse> {
  return apiRequest<CreateTrailReviewResponse>(`/trails/${trailId}/reviews`, {
    method: 'POST',
    token,
    body,
  });
}

// ── Reseñas (puntos turísticos) — mismo cuerpo que senderos ──────────────────

export interface PlaceReview {
  id: string;
  place_id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  rating: number;
  comment: string;
  image_urls?: string[];
  created_at: string;
}

export type PlaceReviewsResponse = Omit<TrailReviewsResponse, 'reviews'> & {
  reviews: PlaceReview[];
};

export async function fetchPlaceReviews(
  placeId: string,
  limit = 20,
  offset = 0,
): Promise<PlaceReviewsResponse> {
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('offset', String(offset));
  return apiRequest<PlaceReviewsResponse>(`/places/${placeId}/reviews?${qs.toString()}`);
}

export type CreatePlaceReviewResponse = {
  message: string;
  review: PlaceReview;
};

export async function createPlaceReview(
  placeId: string,
  token: string,
  body: CreateTrailReviewBody,
): Promise<CreatePlaceReviewResponse> {
  return apiRequest<CreatePlaceReviewResponse>(`/places/${placeId}/reviews`, {
    method: 'POST',
    token,
    body,
  });
}

/**
 * Sube una foto ya comprimida (WebP) al bucket `reviews` vía API.
 * `localUri` debe ser un archivo local (`file://` / content URI).
 */
export async function uploadReviewImage(token: string, localUri: string): Promise<string> {
  const { compressReviewPhotoForUpload } = await import('@/lib/image');
  const compressedUri = await compressReviewPhotoForUpload(localUri);
  const form = new FormData();
  form.append('file', {
    uri: compressedUri,
    name: 'review.webp',
    type: 'image/webp',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE_URL}/uploads/review-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg =
      (typeof data.error === 'string' && data.error) ||
      res.statusText ||
      'Error al subir la imagen';
    throw new ApiHttpError(res.status, msg, data);
  }

  const url = data.url;
  if (typeof url !== 'string' || !url.trim()) {
    throw new ApiHttpError(res.status, 'Respuesta inválida al subir imagen', data);
  }
  return url.trim();
}

export async function uploadReviewImages(token: string, localUris: string[]): Promise<string[]> {
  const slice = localUris.slice(0, REVIEW_GALLERY_MAX_PHOTOS);
  return Promise.all(slice.map((uri) => uploadReviewImage(token, uri)));
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

export async function fetchCompletedTrails(token: string): Promise<TrailsResponse> {
  return apiRequest<TrailsResponse>('/me/completed-trails', { token });
}

export async function addTrailFavorite(token: string, trailId: string): Promise<void> {
  await apiRequest(`/me/favorite-trails/${trailId}`, { method: 'POST', token });
}

export async function removeTrailFavorite(token: string, trailId: string): Promise<void> {
  await apiRequest(`/me/favorite-trails/${trailId}`, { method: 'DELETE', token });
}

export async function fetchFavoritePlaceIds(token: string): Promise<string[]> {
  const data = await apiRequest<{ place_ids: string[] }>('/me/favorite-places/ids', { token });
  return data.place_ids ?? [];
}

export async function addPlaceFavorite(token: string, placeId: string): Promise<void> {
  await apiRequest(`/me/favorite-places/${placeId}`, { method: 'POST', token });
}

// ── Reportes ──────────────────────────────────────────────────────────────────

export interface SubmitReportBody {
  target_type: 'trail' | 'place' | 'review';
  target_id: string;
  reason?: string;
  context_id?: string;
}

export async function submitReport(
  body: SubmitReportBody,
  token?: string | null,
): Promise<void> {
  await apiRequest<{ message: string }>('/reports', {
    method: 'POST',
    body,
    token,
  });
}

export async function removePlaceFavorite(token: string, placeId: string): Promise<void> {
  await apiRequest(`/me/favorite-places/${placeId}`, { method: 'DELETE', token });
}

export interface ProfileStatsResponse {
  completed_trails_count: number;
  reviews_count: number;
  favorites_count: number;
}

export async function fetchProfileStats(token: string): Promise<ProfileStatsResponse> {
  return apiRequest<ProfileStatsResponse>('/me/profile-stats', { token });
}

// ── Wallpapers ────────────────────────────────────────────────────────────────

export interface Wallpaper {
  id: string;
  url: string;
  title: string | null;
  orientation: 'vertical' | 'horizontal';
  order_index: number;
  created_at: string;
}

export interface WallpapersResponse {
  wallpapers: Wallpaper[];
  total: number;
}

export async function fetchWallpapers(
  params: { limit?: number; offset?: number } = {},
): Promise<WallpapersResponse> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<WallpapersResponse>(`/wallpapers${query}`);
}

// ── Historial de senderos (recorridos del usuario) ─────────────────────────────

export interface UserTrailHistoryEntry {
  id: string;
  trail_id: string;
  /** ISO o Unix (segundos/ms); el cliente normaliza en `session-started-at`. */
  started_at?: string | number | null;
  /** Algunas respuestas JSON pueden usar camelCase. */
  startedAt?: string | number | null;
  completed_at: string | null;
  status?: 'in_progress' | 'completed';
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * El backend a veces devuelve `{ entry: { id, trail_id } }` con `started_at` en la raíz,
 * o `data`, o camelCase / PascalCase. Unifica en `UserTrailHistoryEntry`.
 */
function pickStartedAt(...layers: (Record<string, unknown> | null | undefined)[]): unknown {
  for (const o of layers) {
    if (!o) continue;
    const v =
      o.started_at ??
      o.startedAt ??
      o.StartedAt ??
      o.start_time ??
      o.startTime ??
      o.begin_at ??
      o.beginAt;
    if (v != null && v !== '') return v;
  }
  return null;
}

export function parseUserTrailHistoryEntryPayload(body: unknown): UserTrailHistoryEntry {
  if (!isRecord(body)) {
    return { id: '', trail_id: '', started_at: null, completed_at: null };
  }
  const root = body;

  const data = isRecord(root.data) ? root.data : null;
  const result = isRecord(root.result) ? root.result : null;
  const payload = isRecord(root.payload) ? root.payload : null;

  let row: Record<string, unknown> = root;
  if (isRecord(root.entry)) {
    row = root.entry;
  } else if (data) {
    row = isRecord(data.entry) ? data.entry : data;
  } else if (result) {
    row = isRecord(result.entry) ? result.entry : result;
  } else if (payload) {
    row = isRecord(payload.entry) ? payload.entry : payload;
  }

  const started = pickStartedAt(
    row,
    root.entry && isRecord(root.entry) ? root.entry : null,
    data,
    data && isRecord(data.entry) ? data.entry : null,
    result,
    result && isRecord(result.entry) ? result.entry : null,
    payload,
    root,
  );

  if (__DEV__) {
    logRecorridoTimer('parseUserTrailHistoryEntryPayload', {
      rootKeys: Object.keys(root),
      rowKeys: Object.keys(row),
      pickedStarted: started,
      id: String(row.id ?? root.id ?? ''),
    });
  }

  return {
    id: String(row.id ?? root.id ?? ''),
    trail_id: String(
      row.trail_id ?? row.trailId ?? root.trail_id ?? root.trailId ?? data?.trail_id ?? '',
    ),
    started_at: started as string | number | null,
    startedAt: started as string | number | null,
    completed_at: (row.completed_at ?? row.completedAt ?? null) as string | null,
    status: row.status as UserTrailHistoryEntry['status'],
  };
}

/** Valor de `started_at` del backend (snake o camel); fuente del cronómetro de recorrido. */
export function trailHistoryEntryStartedAt(entry: UserTrailHistoryEntry): unknown {
  const e = entry as unknown as Record<string, unknown>;
  return e.started_at ?? e.startedAt ?? e.StartedAt ?? null;
}

/** Registra el inicio del recorrido (`user_trail_history` en backend). */
export async function startUserTrailHistory(
  token: string,
  trailId: string,
): Promise<UserTrailHistoryEntry> {
  const data = await apiRequest<Record<string, unknown>>('/me/trail-history/start', {
    method: 'POST',
    token,
    body: { trail_id: trailId },
  });
  return parseUserTrailHistoryEntryPayload(data);
}

export type BeginTrailHistoryRecorridoResult = {
  entry: UserTrailHistoryEntry;
  /** Mejor estimación UTC ms: cuerpo `server_now_ms` / `db_now_ms`, si no cabecera `Date`. */
  serverNowMs: number | null;
  /** `NOW()` de PostgreSQL en el mismo RETURNING que `started_at` (diagnóstico). */
  dbNowMs: number | null;
};

function readTrailHistoryClockFields(data: Record<string, unknown>): {
  serverNowMs: number | null;
  dbNowMs: number | null;
} {
  const bodyMs =
    typeof data.server_now_ms === 'number' && Number.isFinite(data.server_now_ms)
      ? data.server_now_ms
      : null;
  const dbMs =
    typeof data.db_now_ms === 'number' && Number.isFinite(data.db_now_ms) ? data.db_now_ms : null;
  return { serverNowMs: bodyMs, dbNowMs: dbMs };
}

/**
 * Al abrir la pantalla del recorrido: fija `started_at` en el servidor al instante actual
 * y devuelve la entrada actualizada (fuente del cronómetro).
 */
export async function beginTrailHistoryRecorrido(
  token: string,
  historyEntryId: string,
): Promise<BeginTrailHistoryRecorridoResult> {
  const { data, serverNowMs: headerMs } = await apiRequestWithServerTime<Record<string, unknown>>(
    `/me/trail-history/${historyEntryId}/begin-recorrido`,
    { method: 'POST', token },
  );
  const { serverNowMs: bodyServerMs, dbNowMs } = readTrailHistoryClockFields(data);
  const serverNowMs = bodyServerMs ?? dbNowMs ?? headerMs ?? null;
  if (__DEV__ && bodyServerMs != null && dbNowMs != null && Math.abs(bodyServerMs - dbNowMs) > 5000) {
    logRecorridoTimer('begin-recorrido: server_now_ms vs db_now_ms', {
      bodyServerMs,
      dbNowMs,
      headerMs,
    });
  }
  return {
    entry: parseUserTrailHistoryEntryPayload(data),
    serverNowMs,
    dbNowMs,
  };
}

/** Marca el recorrido como completado y lo deja en el historial. */
export async function completeUserTrailHistory(
  token: string,
  historyEntryId: string,
  gpsPath?: { latitude: number; longitude: number }[],
): Promise<UserTrailHistoryEntry> {
  const data = await apiRequest<Record<string, unknown>>(
    `/me/trail-history/${historyEntryId}/complete`,
    {
      method: 'POST',
      token,
      body: gpsPath && gpsPath.length >= 2 ? { gps_path: gpsPath } : undefined,
    },
  );
  return parseUserTrailHistoryEntryPayload(data);
}

/**
 * Devuelve la última entrada completada del usuario para un sendero, incluyendo
 * la ruta GPS grabada (`gps_path`). Retorna `null` si no completó el sendero.
 */
export async function fetchTrailRecordedPath(
  token: string,
  trailId: string,
): Promise<{ latitude: number; longitude: number }[] | null> {
  try {
    const data = await apiRequest<{ entry?: Record<string, unknown> | null }>(
      `/me/trail-history/by-trail/${trailId}`,
      { token },
    );
    const gpsPath = data.entry?.gps_path;
    if (!Array.isArray(gpsPath) || gpsPath.length < 2) return null;
    return gpsPath.filter(
      (p): p is { latitude: number; longitude: number } =>
        p != null && typeof p.latitude === 'number' && typeof p.longitude === 'number',
    );
  } catch {
    return null;
  }
}

export async function fetchUserTrailHistory(
  token: string,
  params: { limit?: number; offset?: number } = {},
): Promise<{ entries: UserTrailHistoryEntry[]; total?: number }> {
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const q = qs.toString() ? `?${qs.toString()}` : '';
  const data = await apiRequest<{ entries?: unknown[]; total?: number }>(`/me/trail-history${q}`, {
    token,
  });
  const rawList = data.entries ?? [];
  const entries = rawList.map((item) => parseUserTrailHistoryEntryPayload(item));
  return { entries, total: data.total };
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

// ── Destacados (Partners) ──────────────────────────────────────────────────────

export interface FeaturedTrailItem {
  featured_item_id: string;
  order_index: number;
  kind: 'trail';
  id: string;
  slug: string;
  name: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  route_type?: 'circular' | 'lineal' | 'ida_vuelta' | null;
  region?: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  description?: string | null;
  thumbnail_url: string | null;
}

export interface FeaturedPlaceItem {
  featured_item_id: string;
  order_index: number;
  kind: 'place';
  id: string;
  slug: string;
  name: string | null;
  category: string | null;
  region: string | null;
  country?: string | null;
  description: string | null;
  thumbnail_url: string | null;
}

export type FeaturedItem = FeaturedTrailItem | FeaturedPlaceItem;

export async function fetchFeaturedItems(): Promise<FeaturedItem[]> {
  const data = await apiRequest<{ items: FeaturedItem[] }>('/featured');
  return data.items ?? [];
}

/** Medios de un lugar (misma forma que puntos de sendero, sin trail_point_id). */
export interface PlacePointMedia {
  id: string;
  media_type: string;
  url: string;
  thumbnail_url: string | null;
  order_index: number | null;
}

export interface BackendPlaceTrail {
  id: string;
  name: string;
  slug: string;
  difficulty: string | null;
}

export interface BackendPlace {
  id: string;
  slug: string;
  name: string | null;
  category: string | null;
  region: string | null;
  country: string | null;
  description: string | null;
  contact_link: string | null;
  is_premium: boolean;
  latitude: number | null;
  longitude: number | null;
  image_urls: string[];
  /** Galería tipada (cuando el backend la envía); si falta, usar `image_urls`. */
  media?: PlacePointMedia[];
  /** Senderos vinculados a este punto turístico (vacío si no tiene). */
  trails?: BackendPlaceTrail[];
  created_at: string;
  updated_at: string;
}

export async function fetchPlace(placeId: string): Promise<BackendPlace> {
  const data = await apiRequest<{ place: BackendPlace }>(`/places/${placeId}`);
  return data.place;
}

export interface BackendPlaceListItem {
  id: string;
  slug: string;
  name: string | null;
  category: string | null;
  region: string | null;
  country: string | null;
  description: string | null;
  is_premium: boolean;
  contact_link: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlacesListResponse {
  places: BackendPlaceListItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchPlacesList(params: { limit?: number; offset?: number; q?: string } = {}): Promise<PlacesListResponse> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  if (params.q) qs.set('q', params.q);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest<PlacesListResponse>(`/places${query}`);
}

export interface AppConfigBanner {
  active: boolean;
  title: string;
  message: string;
}

export interface AppConfigResponse {
  maintenance: AppConfigBanner;
  required_update: AppConfigBanner;
}

// ── Documentos legales ────────────────────────────────────────────────────────

export interface LegalDocument {
  type: 'terms' | 'privacy';
  content: string;
  updated_at: string | null;
}

export async function fetchLegalDocument(type: 'terms' | 'privacy'): Promise<LegalDocument> {
  return apiRequest<LegalDocument>(`/legal/${type}`);
}

export async function fetchAppConfig(params: {
  platform: 'ios' | 'android';
  build: number;
}): Promise<AppConfigResponse> {
  const qs = new URLSearchParams({
    platform: params.platform,
    build: String(params.build),
  });
  return apiRequest<AppConfigResponse>(`/app/config?${qs.toString()}`);
}

// ─── Profile editing ─────────────────────────────────────────────────────────

export interface UpdateProfileParams {
  fullName?: string;
  avatarUrl?: string | null;
}

export async function updateProfile(
  token: string,
  params: UpdateProfileParams,
): Promise<{ user: Record<string, unknown> }> {
  const body: Record<string, unknown> = {};
  if (params.fullName !== undefined) body.full_name = params.fullName;
  if (params.avatarUrl !== undefined) body.avatar_url = params.avatarUrl;
  return apiRequest('/auth/profile', { method: 'PATCH', token, body });
}

/**
 * Upload a local image URI to the avatars bucket.
 * Returns the public URL of the stored avatar.
 */
export async function uploadAvatar(token: string, localUri: string): Promise<string> {
  const filename = localUri.split('/').pop() ?? 'avatar.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const type = mimeMap[ext] ?? 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri: localUri, name: filename, type } as any);

  const res = await fetch(`${API_BASE_URL}/uploads/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = parseJsonOrEmpty(await res.text());
    throw new ApiHttpError(res.status, (err.error as string) ?? 'Upload failed', err);
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}
