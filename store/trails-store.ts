import { create } from 'zustand';
import { MOCK_TRAILS, Trail } from '@/constants/mock-trails';

interface TrailsStore {
  trails: Trail[];
  featuredTrails: Trail[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTrails: () => Trail[];
}

export const useTrailsStore = create<TrailsStore>((set, get) => ({
  trails: MOCK_TRAILS,
  featuredTrails: MOCK_TRAILS.filter((t) => t.featured),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
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
