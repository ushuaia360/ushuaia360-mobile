import {
  addPlaceFavorite,
  addTrailFavorite,
  fetchFavoritePlaceIds,
  fetchFavoriteTrailIds,
  removePlaceFavorite,
  removeTrailFavorite,
} from '@/services/api';
import { create } from 'zustand';

type IdMap = Record<string, true>;

interface FavoritesState {
  trailIds: IdMap;
  placeIds: IdMap;
  loading: boolean;
  isFavorite: (trailId: string) => boolean;
  isPlaceFavorite: (placeId: string) => boolean;
  setTrailIds: (ids: string[]) => void;
  setPlaceIds: (ids: string[]) => void;
  loadIds: (token: string) => Promise<void>;
  toggleTrail: (
    trailId: string,
    token: string | null,
    nextLiked: boolean,
  ) => Promise<{ ok: boolean; needAuth?: boolean }>;
  togglePlace: (
    placeId: string,
    token: string | null,
    nextLiked: boolean,
  ) => Promise<{ ok: boolean; needAuth?: boolean }>;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  trailIds: {},
  placeIds: {},
  loading: false,

  isFavorite: (trailId) => !!get().trailIds[trailId],

  isPlaceFavorite: (placeId) => !!get().placeIds[placeId],

  setTrailIds: (ids) => {
    const next: IdMap = {};
    for (const id of ids) next[id] = true;
    set({ trailIds: next });
  },

  setPlaceIds: (ids) => {
    const next: IdMap = {};
    for (const id of ids) next[id] = true;
    set({ placeIds: next });
  },

  loadIds: async (token) => {
    set({ loading: true });
    try {
      const [trailIds, placeIds] = await Promise.all([
        fetchFavoriteTrailIds(token),
        fetchFavoritePlaceIds(token).catch(() => [] as string[]),
      ]);
      get().setTrailIds(trailIds);
      get().setPlaceIds(placeIds);
    } catch (e) {
      console.error('loadFavoriteIds error', e);
    } finally {
      set({ loading: false });
    }
  },

  toggleTrail: async (trailId, token, nextLiked) => {
    if (!token) {
      return { ok: false, needAuth: true };
    }
    const prev = { ...get().trailIds };
    if (nextLiked) {
      set({ trailIds: { ...get().trailIds, [trailId]: true } });
    } else {
      const { [trailId]: _, ...rest } = get().trailIds;
      set({ trailIds: rest });
    }
    try {
      if (nextLiked) {
        await addTrailFavorite(token, trailId);
      } else {
        await removeTrailFavorite(token, trailId);
      }
      return { ok: true };
    } catch (e) {
      set({ trailIds: prev });
      console.error('toggleTrail favorite error', e);
      return { ok: false };
    }
  },

  togglePlace: async (placeId, token, nextLiked) => {
    if (!token) {
      return { ok: false, needAuth: true };
    }
    const prev = { ...get().placeIds };
    if (nextLiked) {
      set({ placeIds: { ...get().placeIds, [placeId]: true } });
    } else {
      const { [placeId]: _, ...rest } = get().placeIds;
      set({ placeIds: rest });
    }
    try {
      if (nextLiked) {
        await addPlaceFavorite(token, placeId);
      } else {
        await removePlaceFavorite(token, placeId);
      }
      return { ok: true };
    } catch (e) {
      set({ placeIds: prev });
      console.error('togglePlace favorite error', e);
      return { ok: false };
    }
  },

  clear: () => set({ trailIds: {}, placeIds: {}, loading: false }),
}));
