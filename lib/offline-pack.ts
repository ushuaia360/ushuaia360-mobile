import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  removePlaceOfflineMediaDir,
  removeTrailOfflineMediaDir,
} from '@/lib/offline-media-cache';
import type { BackendPlace, MapMarker, TrailDetail } from '@/services/api';

const MAP_MARKERS_KEY = 'offline_pack_map_markers_v1';
const TRAILS_KEY = 'offline_pack_trails_v1';
const PLACES_KEY = 'offline_pack_places_v1';
const MANUAL_TRAIL_IDS_KEY = 'offline_manual_trail_ids_v1';
const MANUAL_PLACE_IDS_KEY = 'offline_manual_place_ids_v1';

/** Los lugares (puntos turísticos) admiten descarga manual igual que los senderos. */
export const PLACE_MANUAL_DOWNLOAD_DISABLED = false;

type TrailPack = Record<string, TrailDetail>;
type PlacePack = Record<string, BackendPlace>;

async function readStringList(key: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function writeStringList(key: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(ids));
}

// ── Mapa (snapshot al tener red, sin “descarga manual”) ─────────────────────

export async function saveMapMarkersSnapshot(markers: MapMarker[]): Promise<void> {
  await AsyncStorage.setItem(MAP_MARKERS_KEY, JSON.stringify(markers));
}

export async function loadMapMarkersSnapshot(): Promise<MapMarker[] | null> {
  const raw = await AsyncStorage.getItem(MAP_MARKERS_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as MapMarker[]) : null;
  } catch {
    return null;
  }
}

// ── Packs de detalle (rellenados sólo con descarga manual) ───────────────────

export async function saveTrailOfflinePack(detail: TrailDetail): Promise<void> {
  const raw = await AsyncStorage.getItem(TRAILS_KEY);
  let pack: TrailPack = {};
  if (raw) {
    try {
      const p = JSON.parse(raw) as unknown;
      if (p && typeof p === 'object' && !Array.isArray(p)) pack = p as TrailPack;
    } catch {
      pack = {};
    }
  }
  pack[detail.id] = detail;
  await AsyncStorage.setItem(TRAILS_KEY, JSON.stringify(pack));
}

export async function loadTrailOfflinePack(trailId: string): Promise<TrailDetail | null> {
  const raw = await AsyncStorage.getItem(TRAILS_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as TrailPack;
    return p[trailId] ?? null;
  } catch {
    return null;
  }
}

export async function savePlaceOfflinePack(place: BackendPlace): Promise<void> {
  const raw = await AsyncStorage.getItem(PLACES_KEY);
  let pack: PlacePack = {};
  if (raw) {
    try {
      const p = JSON.parse(raw) as unknown;
      if (p && typeof p === 'object' && !Array.isArray(p)) pack = p as PlacePack;
    } catch {
      pack = {};
    }
  }
  pack[place.id] = place;
  await AsyncStorage.setItem(PLACES_KEY, JSON.stringify(pack));
}

export async function loadPlaceOfflinePack(placeId: string): Promise<BackendPlace | null> {
  const raw = await AsyncStorage.getItem(PLACES_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as PlacePack;
    return p[placeId] ?? null;
  } catch {
    return null;
  }
}

// ── Descargas manuales (lista “Mis descargas”) ───────────────────────────────

export async function isTrailManuallyDownloaded(trailId: string): Promise<boolean> {
  const ids = await readStringList(MANUAL_TRAIL_IDS_KEY);
  return ids.includes(trailId);
}

export async function isPlaceManuallyDownloaded(placeId: string): Promise<boolean> {
  if (PLACE_MANUAL_DOWNLOAD_DISABLED) return false;
  const ids = await readStringList(MANUAL_PLACE_IDS_KEY);
  return ids.includes(placeId);
}

export async function addManualTrailDownload(detail: TrailDetail): Promise<void> {
  await saveTrailOfflinePack(detail);
  const ids = await readStringList(MANUAL_TRAIL_IDS_KEY);
  if (!ids.includes(detail.id)) {
    ids.push(detail.id);
    await writeStringList(MANUAL_TRAIL_IDS_KEY, ids);
  }
}

export async function addManualPlaceDownload(place: BackendPlace): Promise<void> {
  if (PLACE_MANUAL_DOWNLOAD_DISABLED) return;
  await savePlaceOfflinePack(place);
  const ids = await readStringList(MANUAL_PLACE_IDS_KEY);
  if (!ids.includes(place.id)) {
    ids.push(place.id);
    await writeStringList(MANUAL_PLACE_IDS_KEY, ids);
  }
}

async function removeTrailFromPack(trailId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(TRAILS_KEY);
  if (!raw) return;
  try {
    const p = JSON.parse(raw) as TrailPack;
    delete p[trailId];
    await AsyncStorage.setItem(TRAILS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

async function removePlaceFromPack(placeId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(PLACES_KEY);
  if (!raw) return;
  try {
    const p = JSON.parse(raw) as PlacePack;
    delete p[placeId];
    await AsyncStorage.setItem(PLACES_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export async function removeManualTrailDownload(trailId: string): Promise<void> {
  const ids = (await readStringList(MANUAL_TRAIL_IDS_KEY)).filter((x) => x !== trailId);
  await writeStringList(MANUAL_TRAIL_IDS_KEY, ids);
  await removeTrailFromPack(trailId);
  await removeTrailOfflineMediaDir(trailId);
}

export async function removeManualPlaceDownload(placeId: string): Promise<void> {
  const ids = (await readStringList(MANUAL_PLACE_IDS_KEY)).filter((x) => x !== placeId);
  await writeStringList(MANUAL_PLACE_IDS_KEY, ids);
  await removePlaceFromPack(placeId);
  await removePlaceOfflineMediaDir(placeId);
}

export type ManualTrailEntry = { id: string; detail: TrailDetail };
export type ManualPlaceEntry = { id: string; place: BackendPlace };

export async function listManualDownloads(): Promise<{
  trails: ManualTrailEntry[];
  places: ManualPlaceEntry[];
}> {
  const trailIds = await readStringList(MANUAL_TRAIL_IDS_KEY);
  const placeIds = PLACE_MANUAL_DOWNLOAD_DISABLED ? [] : await readStringList(MANUAL_PLACE_IDS_KEY);
  const trails: ManualTrailEntry[] = [];
  const places: ManualPlaceEntry[] = [];
  for (const id of trailIds) {
    const detail = await loadTrailOfflinePack(id);
    if (detail) trails.push({ id, detail });
  }
  for (const id of placeIds) {
    const place = await loadPlaceOfflinePack(id);
    if (place) places.push({ id, place });
  }
  return { trails, places };
}
