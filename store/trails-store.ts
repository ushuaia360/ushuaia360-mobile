import { Trail } from '@/constants/mock-trails';
import { BackendPlaceListItem, BackendTrail, fetchPlacesList, fetchTrails } from '@/services/api';
import { create } from 'zustand';

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

// ── Store ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

interface TrailsStore {
  // Senderos destacados (para el bottom sheet)
  featuredTrails: Trail[];
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
  fetchFeaturedTrails: () => Promise<void>;
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
  featuredTrails: [],
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

  /** Carga los senderos destacados para el bottom sheet del mapa */
  fetchFeaturedTrails: async () => {
    set({ loadingFeatured: true });
    try {
      const data = await fetchTrails({ limit: 4 });
      set({ featuredTrails: data.trails.map(mapBackendTrail) });
    } catch (e) {
      console.error('fetchFeaturedTrails error', e);
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
