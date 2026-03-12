import { create } from 'zustand';

type HomeMode = 'map' | 'list';

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
}));
