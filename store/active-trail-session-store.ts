import { normalizeSessionStartedAtToISO } from '@/lib/session-started-at';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY_V1 = 'active_trail_session_v1';
const STORAGE_KEY_V2 = 'active_trail_sessions_v2';

export interface ActiveTrailMapPoint {
  id: string;
  latitude: number;
  longitude: number;
  type?: string | null;
}

export interface ActiveTrailEmergencyPoint {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  latitude: number;
  longitude: number;
}

export interface ActiveTrailSessionSnapshot {
  historyEntryId: string;
  trailId: string;
  trailName: string;
  thumbnailUrl: string | null;
  startedAtISO: string;
  lineCoordinates: { latitude: number; longitude: number }[];
  /** Ruta GPS real del usuario durante el recorrido (se va acumulando en tiempo real). */
  recordedPath?: { latitude: number; longitude: number }[];
  interestPoints: ActiveTrailMapPoint[];
  emergencyPoints: ActiveTrailEmergencyPoint[];
  mainPoint: { latitude: number; longitude: number } | null;
  fallbackCenter: { latitude: number; longitude: number };
  minimized: boolean;
  /** Grabación en pausa (solo por acción explícita del usuario, nunca por backgrounding). */
  paused?: boolean;
  /**
   * `false` / ausente: hay que llamar a `begin-recorrido` y alinear `started_at` con el servidor.
   * `true`: ya sincronizado.
   */
  beganRecorridoSynced?: boolean;
}

export function selectActiveSession(state: {
  sessions: ActiveTrailSessionSnapshot[];
  activeHistoryEntryId: string | null;
}): ActiveTrailSessionSnapshot | null {
  if (state.sessions.length === 0) return null;
  if (state.activeHistoryEntryId) {
    const found = state.sessions.find((x) => x.historyEntryId === state.activeHistoryEntryId);
    if (found) return found;
  }
  return state.sessions[0];
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
  if (hasIso) {
    return {
      ...s,
      emergencyPoints: Array.isArray(s.emergencyPoints) ? s.emergencyPoints : [],
      recordedPath: Array.isArray(s.recordedPath) ? s.recordedPath : [],
    } as ActiveTrailSessionSnapshot;
  }
  const fromDb = s.started_at ?? s.startedAt;
  if (fromDb != null && fromDb !== '') {
    return {
      ...s,
      startedAtISO: normalizeSessionStartedAtToISO(fromDb),
      emergencyPoints: Array.isArray(s.emergencyPoints) ? s.emergencyPoints : [],
      recordedPath: Array.isArray(s.recordedPath) ? s.recordedPath : [],
    };
  }
  return {
    ...(s as ActiveTrailSessionSnapshot),
    emergencyPoints: Array.isArray(s.emergencyPoints) ? s.emergencyPoints : [],
    recordedPath: Array.isArray(s.recordedPath) ? s.recordedPath : [],
  };
}

async function persistState(
  sessions: ActiveTrailSessionSnapshot[],
  activeHistoryEntryId: string | null,
) {
  if (sessions.length === 0) {
    await AsyncStorage.multiRemove([STORAGE_KEY_V1, STORAGE_KEY_V2]);
    return;
  }
  await AsyncStorage.setItem(
    STORAGE_KEY_V2,
    JSON.stringify({ sessions, activeHistoryEntryId }),
  );
  await AsyncStorage.removeItem(STORAGE_KEY_V1);
}

interface ActiveTrailSessionState {
  sessions: ActiveTrailSessionSnapshot[];
  activeHistoryEntryId: string | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  /**
   * Inserta o reemplaza la sesión de ese `trailId` (un recorrido local por sendero).
   * La sesión pasada queda activa.
   */
  upsertSession: (session: ActiveTrailSessionSnapshot) => Promise<void>;
  /** `null` limpia todo; si no, equivale a `upsertSession`. */
  setSession: (session: ActiveTrailSessionSnapshot | null) => Promise<void>;
  setActiveHistoryEntryId: (historyEntryId: string) => Promise<void>;
  updateActiveSession: (patch: Partial<ActiveTrailSessionSnapshot>) => Promise<void>;
  removeSessionByHistoryId: (historyEntryId: string) => Promise<void>;
  setMinimized: (minimized: boolean) => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useActiveTrailSessionStore = create<ActiveTrailSessionState>((set, get) => ({
  sessions: [],
  activeHistoryEntryId: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const rawV2 = await AsyncStorage.getItem(STORAGE_KEY_V2);
      if (rawV2) {
        const parsed = JSON.parse(rawV2) as {
          sessions?: unknown[];
          activeHistoryEntryId?: string | null;
        };
        const sessions = Array.isArray(parsed.sessions)
          ? parsed.sessions
              .map(migratePersistedSession)
              .filter((x): x is ActiveTrailSessionSnapshot => x != null)
          : [];
        let activeHistoryEntryId =
          typeof parsed.activeHistoryEntryId === 'string' ? parsed.activeHistoryEntryId : null;
        if (activeHistoryEntryId && !sessions.some((x) => x.historyEntryId === activeHistoryEntryId)) {
          activeHistoryEntryId = sessions[0]?.historyEntryId ?? null;
        }
        if (sessions.length > 0 && !activeHistoryEntryId) {
          activeHistoryEntryId = sessions[0].historyEntryId;
        }
        set({ sessions, activeHistoryEntryId, hydrated: true });
        return;
      }

      const rawV1 = await AsyncStorage.getItem(STORAGE_KEY_V1);
      if (rawV1) {
        const one = migratePersistedSession(JSON.parse(rawV1));
        if (one) {
          set({
            sessions: [one],
            activeHistoryEntryId: one.historyEntryId,
            hydrated: true,
          });
          await persistState([one], one.historyEntryId);
          await AsyncStorage.removeItem(STORAGE_KEY_V1);
          return;
        }
      }

      set({ sessions: [], activeHistoryEntryId: null, hydrated: true });
    } catch {
      set({ sessions: [], activeHistoryEntryId: null, hydrated: true });
    }
  },

  upsertSession: async (session) => {
    const others = get().sessions.filter((s) => s.trailId !== session.trailId);
    const nextSessions = [...others, session];
    const activeHistoryEntryId = session.historyEntryId;
    set({ sessions: nextSessions, activeHistoryEntryId });
    await persistState(nextSessions, activeHistoryEntryId);
  },

  setSession: async (session) => {
    if (session == null) {
      await get().clearSession();
      return;
    }
    await get().upsertSession(session);
  },

  setActiveHistoryEntryId: async (historyEntryId: string) => {
    const sessions = get().sessions;
    if (!sessions.some((s) => s.historyEntryId === historyEntryId)) return;
    set({ activeHistoryEntryId: historyEntryId });
    await persistState(sessions, historyEntryId);
  },

  updateActiveSession: async (patch) => {
    const active = selectActiveSession(get());
    if (!active) return;
    const id = active.historyEntryId;
    const nextSessions = get().sessions.map((s) =>
      s.historyEntryId === id ? { ...s, ...patch } : s,
    );
    let activeHistoryEntryId = get().activeHistoryEntryId;
    if (
      typeof patch.historyEntryId === 'string' &&
      patch.historyEntryId !== id &&
      activeHistoryEntryId === id
    ) {
      activeHistoryEntryId = patch.historyEntryId;
    }
    set({ sessions: nextSessions, activeHistoryEntryId });
    await persistState(nextSessions, activeHistoryEntryId);
  },

  removeSessionByHistoryId: async (historyEntryId: string) => {
    const prev = get().sessions;
    const sessions = prev.filter((s) => s.historyEntryId !== historyEntryId);
    let activeHistoryEntryId = get().activeHistoryEntryId;
    if (activeHistoryEntryId === historyEntryId) {
      activeHistoryEntryId = sessions[0]?.historyEntryId ?? null;
    }
    set({ sessions, activeHistoryEntryId });
    await persistState(sessions, activeHistoryEntryId);
  },

  setMinimized: async (minimized) => {
    const active = selectActiveSession(get());
    if (!active) return;
    const id = active.historyEntryId;
    const nextSessions = get().sessions.map((s) =>
      s.historyEntryId === id ? { ...s, minimized } : s,
    );
    set({ sessions: nextSessions });
    await persistState(nextSessions, get().activeHistoryEntryId);
  },

  clearSession: async () => {
    set({ sessions: [], activeHistoryEntryId: null });
    await AsyncStorage.multiRemove([STORAGE_KEY_V1, STORAGE_KEY_V2]);
  },
}));
