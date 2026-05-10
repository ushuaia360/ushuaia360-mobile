import {
  completeUserTrailHistory,
  startUserTrailHistory,
} from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pending_trail_completions_v1';

export type PendingTrailCompletion = {
  trailId: string;
  /** Si `start` ya creó fila en servidor pero `complete` falló. */
  serverHistoryEntryId?: string;
  queuedAt: string;
};

async function readAll(): Promise<PendingTrailCompletion[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PendingTrailCompletion[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(items: PendingTrailCompletion[]): Promise<void> {
  if (items.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Una entrada pendiente por sendero (la última gana). */
export async function enqueuePendingTrailCompletion(
  item: Omit<PendingTrailCompletion, 'queuedAt'>,
): Promise<void> {
  const list = await readAll();
  const next = list.filter((x) => x.trailId !== item.trailId);
  next.push({ ...item, queuedAt: new Date().toISOString() });
  await writeAll(next);
}

export async function listPendingTrailCompletions(): Promise<PendingTrailCompletion[]> {
  return readAll();
}

/**
 * Intenta completar en servidor cada ítem pendiente. Fallos silenciosos reintentan al próximo flush.
 */
export async function flushPendingTrailCompletions(token: string): Promise<void> {
  const list = await readAll();
  if (list.length === 0) return;

  const remaining: PendingTrailCompletion[] = [];

  for (const p of list) {
    let createdServerId: string | undefined;
    try {
      let historyId = p.serverHistoryEntryId;
      if (!historyId) {
        const entry = await startUserTrailHistory(token, p.trailId);
        historyId = entry.id;
        createdServerId = entry.id;
      }
      await completeUserTrailHistory(token, historyId);
    } catch {
      remaining.push(
        createdServerId && !p.serverHistoryEntryId
          ? { ...p, serverHistoryEntryId: createdServerId, queuedAt: p.queuedAt }
          : p,
      );
    }
  }

  await writeAll(remaining);
}
