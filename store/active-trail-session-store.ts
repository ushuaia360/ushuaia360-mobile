import { normalizeSessionStartedAtToISO } from '@/lib/session-started-at';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'active_trail_session_v1';

export interface ActiveTrailMapPoint {
  id: string;
  latitude: number;
  longitude: number;
  type?: string | null;
}

export interface ActiveTrailSessionSnapshot {
  historyEntryId: string;
  trailId: string;
  trailName: string;
  thumbnailUrl: string | null;
  startedAtISO: string;
  lineCoordinates: { latitude: number; longitude: number }[];
  interestPoints: ActiveTrailMapPoint[];
  mainPoint: { latitude: number; longitude: number } | null;
  fallbackCenter: { latitude: number; longitude: number };
  minimized: boolean;
  /**
   * `false` / ausente: hay que llamar a `begin-recorrido` y alinear `started_at` con el servidor.
   * `true`: ya sincronizado.
   */
  beganRecorridoSynced?: boolean;
}

interface ActiveTrailSessionState {
  session: ActiveTrailSessionSnapshot | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  /** Reemplaza la sesión activa y la persiste. */
  setSession: (session: ActiveTrailSessionSnapshot | null) => Promise<void>;
  setMinimized: (minimized: boolean) => Promise<void>;
  clearSession: () => Promise<void>;
}

async function persist(session: ActiveTrailSessionSnapshot | null) {
  if (session == null) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

type PersistedSessionLoose = ActiveTrailSessionSnapshot & {
  started_at?: unknown;
  startedAt?: unknown;
};

/** Snapshots viejos o JSON con `started_at` / `startedAt` (DB) en lugar de `startedAtISO`. */
function migratePersistedSession(raw: unknown): ActiveTrailSessionSnapshot | null {
  if (raw == null || typeof raw !== 'object') return null;
  const s = raw as PersistedSessionLoose;
  const iso = s.startedAtISO;
  const hasIso = iso != null && String(iso).trim() !== '';
  if (hasIso) return s as ActiveTrailSessionSnapshot;
  const fromDb = s.started_at ?? s.startedAt;
  if (fromDb != null && fromDb !== '') {
    return {
      ...s,
      startedAtISO: normalizeSessionStartedAtToISO(fromDb),
    };
  }
  return s as ActiveTrailSessionSnapshot;
}

export const useActiveTrailSessionStore = create<ActiveTrailSessionState>((set, get) => ({
  session: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const session = raw ? migratePersistedSession(JSON.parse(raw)) : null;
      set({ session, hydrated: true });
    } catch {
      set({ session: null, hydrated: true });
    }
  },

  setSession: async (session) => {
    set({ session });
    await persist(session);
  },

  setMinimized: async (minimized) => {
    const cur = get().session;
    if (!cur) return;
    const next = { ...cur, minimized };
    set({ session: next });
    await persist(next);
  },

  clearSession: async () => {
    set({ session: null });
    await persist(null);
  },
}));
