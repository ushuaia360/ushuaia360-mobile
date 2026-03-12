import { create } from 'zustand';

type HomeMode = 'map' | 'list';

interface HomeStore {
  mode: HomeMode;
  setMode: (mode: HomeMode) => void;
  toggleMode: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

export const useHomeStore = create<HomeStore>((set, get) => ({
  mode: 'map',
  setMode: (mode) => set({ mode }),
  toggleMode: () => set({ mode: get().mode === 'map' ? 'list' : 'map' }),
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
}));
