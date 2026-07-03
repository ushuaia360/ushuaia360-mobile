import { create } from 'zustand';

type HomeMode = 'map' | 'list';

export interface PendingListFilters {
  filterKind: string[];
  filterCategory: string[];
}

interface HomeStore {
  mode: HomeMode;
  setMode: (mode: HomeMode) => void;
  toggleMode: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  mapPanning: boolean;
  setMapPanning: (panning: boolean) => void;
  bottomSheetIndex: number | null;
  setBottomSheetIndex: (index: number | null) => void;
  /** Filtros a aplicar la próxima vez que se monte la vista de lista (p. ej. desde categorías del Home). */
  pendingListFilters: PendingListFilters | null;
  setPendingListFilters: (filters: PendingListFilters) => void;
  consumePendingListFilters: () => PendingListFilters | null;
}

export const useHomeStore = create<HomeStore>((set, get) => ({
  mode: 'map',
  setMode: (mode) => set({ mode }),
  toggleMode: () => set({ mode: get().mode === 'map' ? 'list' : 'map' }),
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  mapPanning: false,
  setMapPanning: (panning) => set({ mapPanning: panning }),
  bottomSheetIndex: null,
  setBottomSheetIndex: (index) => set({ bottomSheetIndex: index }),
  pendingListFilters: null,
  setPendingListFilters: (filters) => set({ pendingListFilters: filters }),
  consumePendingListFilters: () => {
    const filters = get().pendingListFilters;
    set({ pendingListFilters: null });
    return filters;
  },
}));
