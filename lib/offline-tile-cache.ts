import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { latToTileY, lonToTileX } from '@/lib/map-projection';

/**
 * Mismas fuentes de tiles que `TrailRouteTileMap` / `TrailTileMapPreview` (CartoDB basemaps).
 */
const TILE_SOURCES = {
  light: 'https://a.basemaps.cartocdn.com/light_all',
  dark: 'https://a.basemaps.cartocdn.com/dark_all',
} as const;

export type TileTheme = keyof typeof TILE_SOURCES;

/** Niveles de zoom cacheados por sendero (cubre el fit inicial y el acercamiento manual hasta z16-17). */
const TILE_ZOOM_LEVELS = [12, 13, 14, 15, 16, 17];

/** Margen (grados) alrededor del bounding box del sendero al precalcular qué tiles bajar. */
const BBOX_PADDING_DEG = 0.008;

/** Tope de tiles por sendero (por tema): evita descargas descontroladas en senderos muy largos. */
const MAX_TILES_PER_THEME = 900;

/** Descargas simultáneas. */
const CONCURRENCY = 6;

function tileDir(trailId: string, theme: TileTheme): string {
  return `${FileSystem.documentDirectory}offline-tiles/${trailId}/${theme}/`;
}

/** Misma forma de key que `calcTilesLikeHome` (`${zoom}-${tx}-${ty}`) para poder cruzarlas directo. */
function tileKey(z: number, x: number, y: number): string {
  return `${z}-${x}-${y}`;
}

export function offlineTileFileUri(trailId: string, theme: TileTheme, key: string): string {
  return `${tileDir(trailId, theme)}${key}.png`;
}

interface BBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

function boundingBoxOf(coords: { latitude: number; longitude: number }[]): BBox | null {
  if (!coords.length) return null;
  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLon = coords[0].longitude;
  let maxLon = coords[0].longitude;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLon = Math.min(minLon, c.longitude);
    maxLon = Math.max(maxLon, c.longitude);
  }
  return {
    minLat: minLat - BBOX_PADDING_DEG,
    maxLat: maxLat + BBOX_PADDING_DEG,
    minLon: minLon - BBOX_PADDING_DEG,
    maxLon: maxLon + BBOX_PADDING_DEG,
  };
}

function tilesForBoundingBox(bbox: BBox, zoom: number): { x: number; y: number }[] {
  const minX = Math.floor(lonToTileX(bbox.minLon, zoom));
  const maxX = Math.floor(lonToTileX(bbox.maxLon, zoom));
  // lat invertida: maxLat -> menor tileY
  const minY = Math.floor(latToTileY(bbox.maxLat, zoom));
  const maxY = Math.floor(latToTileY(bbox.minLat, zoom));
  const maxTile = Math.pow(2, zoom) - 1;
  const tiles: { x: number; y: number }[] = [];
  for (let x = Math.max(0, minX); x <= Math.min(maxTile, maxX); x++) {
    for (let y = Math.max(0, minY); y <= Math.min(maxTile, maxY); y++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function runNext(): Promise<void> {
    const i = next++;
    if (i >= items.length) return;
    await worker(items[i]);
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()));
}

/**
 * Descarga y guarda localmente los tiles del mapa (ambos temas) que cubren el recorrido de un
 * sendero, para que `TrailRouteTileMap` pueda mostrarlos sin conexión. No lanza si falla —
 * es un "mejor esfuerzo": los tiles que no se puedan bajar simplemente no estarán cacheados.
 */
export async function downloadTrailOfflineTiles(
  trailId: string,
  coords: { latitude: number; longitude: number }[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (Platform.OS === 'web') return;
  const bbox = boundingBoxOf(coords);
  if (!bbox) return;

  const jobs: { theme: TileTheme; z: number; x: number; y: number }[] = [];
  for (const theme of Object.keys(TILE_SOURCES) as TileTheme[]) {
    let countForTheme = 0;
    for (const z of TILE_ZOOM_LEVELS) {
      if (countForTheme >= MAX_TILES_PER_THEME) break;
      for (const { x, y } of tilesForBoundingBox(bbox, z)) {
        if (countForTheme >= MAX_TILES_PER_THEME) break;
        jobs.push({ theme, z, x, y });
        countForTheme++;
      }
    }
  }
  if (!jobs.length) return;

  for (const theme of Object.keys(TILE_SOURCES) as TileTheme[]) {
    await FileSystem.makeDirectoryAsync(tileDir(trailId, theme), { intermediates: true }).catch(() => {});
  }

  let done = 0;
  await runWithConcurrency(jobs, CONCURRENCY, async (job) => {
    const dest = offlineTileFileUri(trailId, job.theme, tileKey(job.z, job.x, job.y));
    try {
      const info = await FileSystem.getInfoAsync(dest);
      if (!info.exists) {
        const url = `${TILE_SOURCES[job.theme]}/${job.z}/${job.x}/${job.y}.png`;
        const res = await FileSystem.downloadAsync(url, dest);
        if (res.status >= 400) {
          await FileSystem.deleteAsync(dest, { idempotent: true });
        }
      }
    } catch {
      /* tile individual no disponible: se omite, no es fatal para la descarga */
    } finally {
      done++;
      onProgress?.(done, jobs.length);
    }
  });
}

/** Claves (`${z}-${x}-${y}`) de los tiles ya cacheados para un sendero + tema. */
export async function listCachedTileKeys(trailId: string, theme: TileTheme): Promise<Set<string>> {
  if (Platform.OS === 'web') return new Set();
  try {
    const files = await FileSystem.readDirectoryAsync(tileDir(trailId, theme));
    return new Set(files.filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -'.png'.length)));
  } catch {
    return new Set();
  }
}

export async function removeTrailOfflineTiles(trailId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await FileSystem.deleteAsync(`${FileSystem.documentDirectory}offline-tiles/${trailId}/`, {
    idempotent: true,
  });
}
