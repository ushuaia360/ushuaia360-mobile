import { fetchAppConfig, type AppConfigBanner } from '@/services/api';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';

function getCurrentBuild(): number {
  const raw = Constants.nativeBuildVersion;
  const n = parseInt(raw ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}

interface AppConfigState {
  maintenance: AppConfigBanner | null;
  requiredUpdate: AppConfigBanner | null;
  lastCheckedAt: number | null;
  fetch: () => Promise<void>;
}

export const useAppConfigStore = create<AppConfigState>((set) => ({
  maintenance: null,
  requiredUpdate: null,
  lastCheckedAt: null,

  fetch: async () => {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const build = getCurrentBuild();
      const data = await fetchAppConfig({ platform, build });
      set({
        maintenance: data.maintenance,
        requiredUpdate: data.required_update,
        lastCheckedAt: Date.now(),
      });
    } catch {
      // Silencioso: si falla la red, no bloqueamos la app
    }
  },
}));
