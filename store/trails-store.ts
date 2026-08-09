import { Trail } from '@/constants/mock-trails';
import {
  BackendPlaceListItem,
  BackendTrail,
  FeaturedItem,
  FeaturedPlaceItem,
  FeaturedTrailItem,
  fetchFeaturedItems,
  fetchPlacesList,
  fetchTrails,
} from '@/services/api';
import { create } from 'zustand';

export type FeaturedTrail = Trail & { kind: 'trail'; featuredItemId: string };
export type FeaturedPlace = FeaturedPlaceItem & { featuredItemId: string };
export type FeaturedListItem = FeaturedTrail | FeaturedPlace;

// ── Mappers ───────────────────────────────────────────────────────────────────

const DIFFICULTY_MAP: Record<string, Trail['difficulty']> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

const ROUTE_TYPE_MAP: Record<string, string> = {
  circular: 'Circular',
  lineal: 'Lineal',
  ida_vuelta: 'Ida y vuelta',
};

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';

function formatDuration(minutes: number | null): string {
  if (!minutes) return '-';
  const hours = minutes / 60;
  const low = Math.floor(hours);
  const high = Math.ceil(hours);
  return low === high ? `${low} hs` : `${low}-${high} hs`;
}

export function mapBackendTrail(t: BackendTrail): Trail {
  const images =
    Array.isArray(t.image_urls) && t.image_urls.length > 0
      ? t.image_urls
      : t.thumbnail_url
      ? [t.thumbnail_url]
      : [PLACEHOLDER_IMAGE];

  return {
    id: t.id,
    name: t.name || t.region || t.slug || 'Sendero',
    difficulty: DIFFICULTY_MAP[t.difficulty] ?? 'Fácil',
    distance: t.distance_km != null ? `${t.distance_km} km` : '-',
    distanceKm: t.distance_km ?? 0,
    duration: formatDuration(t.duration_minutes),
    elevationGain: t.elevation_gain != null ? `${t.elevation_gain} m` : '-',
    type: ROUTE_TYPE_MAP[t.route_type] ?? t.route_type ?? 'Trekking',
    image: images[0],
    images,
    description: t.description ?? '',
    featured: t.is_featured ?? false,
    rating: 0,
    reviewCount: 0,
    coordinate:
      t.map_point != null
        ? { latitude: t.map_point.latitude, longitude: t.map_point.longitude }
        : { latitude: -54.8019, longitude: -68.303 },
  };
}

function mapFeaturedTrailItem(item: FeaturedTrailItem): FeaturedTrail {
  const images = item.thumbnail_url ? [item.thumbnail_url] : [PLACEHOLDER_IMAGE];
  return {
    id: item.id,
    name: item.name || item.region || item.slug || 'Sendero',
    difficulty: DIFFICULTY_MAP[item.difficulty] ?? 'Fácil',
    distance: item.distance_km != null ? `${item.distance_km} km` : '-',
    distanceKm: item.distance_km ?? 0,
    duration: formatDuration(item.duration_minutes),
    elevationGain: '-',
    type: ROUTE_TYPE_MAP[item.route_type ?? ''] ?? item.route_type ?? 'Trekking',
    image: images[0],
    images,
    description: item.description ?? '',
    featured: true,
    rating: 0,
    reviewCount: 0,
    coordinate: { latitude: -54.8019, longitude: -68.303 },
    kind: 'trail',
    featuredItemId: item.featured_item_id,
  };
}

function mapFeaturedItem(item: FeaturedItem): FeaturedListItem {
  if (item.kind === 'trail') return mapFeaturedTrailItem(item);
  return { ...item, featuredItemId: item.featured_item_id };
}

// ── Store ─────────────────────────────────────────────────────────────────────

// El backend limita `limit` a 100 (ver routes/trails.py). Traemos todo de una para que la
// búsqueda y el conteo de resultados de los filtros trabajen sobre el set completo de senderos,
// no solo sobre la página ya cargada.
const PAGE_SIZE = 100;

interface TrailsStore {
  // Destacados (senderos + puntos turísticos, orden curado desde Partners) — para el home y el bottom sheet del mapa
  featured: FeaturedListItem[];
  loadingFeatured: boolean;
  // Todos los senderos con paginación (para la vista de lista)
  trails: Trail[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  // Puntos turísticos
  places: BackendPlaceListItem[];
  placesTotal: number;
  loadingPlaces: boolean;
  // Búsqueda
  searchQuery: string;
  recentSearches: string[];
  // Acciones
  fetchFeatured: () => Promise<void>;
  fetchTrails: (reset?: boolean) => Promise<void>;
  loadMoreTrails: () => Promise<void>;
  fetchPlaces: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  addRecentSearch: (query: string) => void;
  filteredTrails: () => Trail[];
  filteredPlaces: () => BackendPlaceListItem[];
}

export type { BackendPlaceListItem };

export const useTrailsStore = create<TrailsStore>((set, get) => ({
  featured: [],
  loadingFeatured: false,
  trails: [],
  total: 0,
  hasMore: true,
  loading: false,
  loadingMore: false,
  places: [],
  placesTotal: 0,
  loadingPlaces: false,
  searchQuery: '',
  recentSearches: [
    'Laguna Esmeralda',
    'Glaciar Martial',
    'Cerro Guanaco',
    'Bahía Lapataia',
    'Paso Garibaldi',
  ],

  /** Carga los destacados (senderos + puntos turísticos) para el home y el bottom sheet del mapa */
  fetchFeatured: async () => {
    set({ loadingFeatured: true });
    try {
      const data = await fetchFeaturedItems();
      set({ featured: data.map(mapFeaturedItem) });
    } catch (e) {
      console.error('fetchFeatured error', e);
    } finally {
      set({ loadingFeatured: false });
    }
  },

  /** Carga la primera página de todos los senderos */
  fetchTrails: async (reset = true) => {
    if (reset) {
      set({ loading: true, trails: [], hasMore: true });
    }
    try {
      const offset = reset ? 0 : get().trails.length;
      const data = await fetchTrails({ limit: PAGE_SIZE, offset });
      const mapped = data.trails.map(mapBackendTrail);
      set((state) => ({
        trails: reset ? mapped : [...state.trails, ...mapped],
        total: data.total,
        hasMore: (reset ? mapped.length : state.trails.length + mapped.length) < data.total,
      }));
    } catch (e) {
      console.error('fetchTrails error', e);
    } finally {
      set({ loading: false });
    }
  },

  /** Carga la siguiente página */
  loadMoreTrails: async () => {
    const { hasMore, loadingMore, loading } = get();
    if (!hasMore || loadingMore || loading) return;
    set({ loadingMore: true });
    try {
      const offset = get().trails.length;
      const data = await fetchTrails({ limit: PAGE_SIZE, offset });
      const mapped = data.trails.map(mapBackendTrail);
      set((state) => ({
        trails: [...state.trails, ...mapped],
        total: data.total,
        hasMore: state.trails.length + mapped.length < data.total,
      }));
    } catch (e) {
      console.error('loadMoreTrails error', e);
    } finally {
      set({ loadingMore: false });
    }
  },

  fetchPlaces: async () => {
    set({ loadingPlaces: true });
    try {
      const data = await fetchPlacesList({ limit: 100 });
      set({ places: data.places, placesTotal: data.total });
    } catch (e) {
      console.error('fetchPlaces error', e);
    } finally {
      set({ loadingPlaces: false });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  addRecentSearch: (query) => {
    const q = query.trim();
    if (!q) return;
    set((state) => ({
      recentSearches: [q, ...state.recentSearches.filter((r) => r !== q)].slice(0, 3),
    }));
  },

  filteredTrails: () => {
    const { trails, searchQuery } = get();
    if (!searchQuery.trim()) return trails;
    const q = searchQuery.toLowerCase();
    return trails.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.difficulty.toLowerCase().includes(q),
    );
  },

  filteredPlaces: () => {
    const { places, searchQuery } = get();
    if (!searchQuery.trim()) return places;
    const q = searchQuery.toLowerCase();
    return places.filter(
      (p) =>
        (p.name ?? '').toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q) ||
        (p.region ?? '').toLowerCase().includes(q),
    );
  },
}));
