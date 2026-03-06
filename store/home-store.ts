import { create } from 'zustand';

type HomeMode = 'map' | 'list';

interface HomeStore {
  mode: HomeMode;
  setMode: (mode: HomeMode) => void;
  toggleMode: () => void;
}

export const useHomeStore = create<HomeStore>((set, get) => ({
  mode: 'map',
  setMode: (mode) => set({ mode }),
  toggleMode: () => set({ mode: get().mode === 'map' ? 'list' : 'map' }),
}));
