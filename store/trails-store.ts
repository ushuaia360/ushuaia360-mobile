import { create } from 'zustand';
import { MOCK_TRAILS, Trail } from '@/constants/mock-trails';

interface TrailsStore {
  trails: Trail[];
  featuredTrails: Trail[];
  searchQuery: string;
  recentSearches: string[];
  setSearchQuery: (query: string) => void;
  addRecentSearch: (query: string) => void;
  filteredTrails: () => Trail[];
}

export const useTrailsStore = create<TrailsStore>((set, get) => ({
  trails: MOCK_TRAILS,
  featuredTrails: MOCK_TRAILS.filter((t) => t.featured),
  searchQuery: '',
  recentSearches: ['Laguna Esmeralda', 'Glaciar Martial', 'Cerro Guanaco', 'Bahía Lapataia', 'Paso Garibaldi'],
  setSearchQuery: (query) => set({ searchQuery: query }),
  addRecentSearch: (query) => {
    const q = query.trim();
    if (!q) return;
    set((state) => ({
      recentSearches: [q, ...state.recentSearches.filter((r) => r !== q)].slice(0, 5),
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
}));
