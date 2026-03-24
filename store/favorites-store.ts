import {
  addTrailFavorite,
  fetchFavoriteTrailIds,
  removeTrailFavorite,
} from '@/services/api';
import { create } from 'zustand';

type TrailIdsMap = Record<string, true>;

interface FavoritesState {
  trailIds: TrailIdsMap;
  loading: boolean;
  isFavorite: (trailId: string) => boolean;
  setTrailIds: (ids: string[]) => void;
  loadIds: (token: string) => Promise<void>;
  toggleTrail: (
    trailId: string,
    token: string | null,
    nextLiked: boolean,
  ) => Promise<{ ok: boolean; needAuth?: boolean }>;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  trailIds: {},
  loading: false,

  isFavorite: (trailId) => !!get().trailIds[trailId],

  setTrailIds: (ids) => {
    const next: TrailIdsMap = {};
    for (const id of ids) next[id] = true;
    set({ trailIds: next });
  },

  loadIds: async (token) => {
    set({ loading: true });
    try {
      const ids = await fetchFavoriteTrailIds(token);
      get().setTrailIds(ids);
    } catch (e) {
      console.error('loadFavoriteTrailIds error', e);
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

  clear: () => set({ trailIds: {}, loading: false }),
}));
