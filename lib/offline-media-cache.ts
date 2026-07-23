import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import type { BackendPlace, TrailDetail } from '@/services/api';

function extensionFromUrl(url: string): string {
  const pathOnly = url.split('?')[0];
  const m = pathOnly.match(/\.(jpe?g|png|webp|gif)(\s*)$/i);
  if (m) return `.${m[1].toLowerCase()}`;
  return '.jpg';
}

function toAbsoluteHttp(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const resolved = resolveApiMediaUrl(t);
  return resolved && /^https?:\/\//i.test(resolved) ? resolved : null;
}

function collectTrailHttpUrls(detail: TrailDetail): string[] {
  const seen = new Set<string>();
  const add = (raw: string | null | undefined) => {
    const abs = toAbsoluteHttp(raw);
    if (abs) seen.add(abs);
  };
  add(detail.thumbnail_url);
  detail.image_urls?.forEach((u) => add(u));
  detail.media?.forEach((m) => {
    add(m.url);
    add(m.thumbnail_url);
  });
  detail.points?.forEach((p) => {
    p.media?.forEach((m) => {
      add(m.url);
      add(m.thumbnail_url);
    });
  });
  return [...seen];
}

function collectPlaceHttpUrls(place: BackendPlace): string[] {
  const seen = new Set<string>();
  const add = (raw: string | null | undefined) => {
    const abs = toAbsoluteHttp(raw);
    if (abs) seen.add(abs);
  };
  place.image_urls?.forEach((u) => add(u));
  place.media?.forEach((m) => {
    add(m.url);
    add(m.thumbnail_url);
  });
  return [...seen];
}

async function localFileUriForDownloadedUrl(
  absUrl: string,
  entityFolder: string,
  entityId: string,
): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, absUrl);
  const short = hash.slice(0, 24);
  const dir = `${FileSystem.documentDirectory}${entityFolder}/${entityId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  return `${dir}${short}${extensionFromUrl(absUrl)}`;
}

function swapMediaUri(
  raw: string | null | undefined,
  httpToFile: Map<string, string>,
): string | null | undefined {
  if (raw == null || raw === '') return raw;
  const t = String(raw);
  if (t.startsWith('file://')) return raw;
  const abs = toAbsoluteHttp(raw) ?? (t.startsWith('http') ? t : null);
  if (abs && httpToFile.has(abs)) return httpToFile.get(abs)!;
  if (httpToFile.has(t)) return httpToFile.get(t)!;
  return raw;
}

function rewriteTrailDetail(detail: TrailDetail, httpToFile: Map<string, string>): TrailDetail {
  const d = JSON.parse(JSON.stringify(detail)) as TrailDetail;
  d.thumbnail_url = swapMediaUri(d.thumbnail_url, httpToFile) as string | null;
  if (d.image_urls?.length) d.image_urls = d.image_urls.map((u) => swapMediaUri(u, httpToFile) as string);
  if (d.media?.length) {
    d.media = d.media.map((m) => ({
      ...m,
      url: swapMediaUri(m.url, httpToFile) as string,
      thumbnail_url: swapMediaUri(m.thumbnail_url, httpToFile) as string | null,
    }));
  }
  if (d.points?.length) {
    d.points = d.points.map((p) => ({
      ...p,
      media: p.media.map((m) => ({
        ...m,
        url: swapMediaUri(m.url, httpToFile) as string,
        thumbnail_url: swapMediaUri(m.thumbnail_url, httpToFile) as string | null,
      })),
    }));
  }
  return d;
}

function rewritePlace(place: BackendPlace, httpToFile: Map<string, string>): BackendPlace {
  const p = JSON.parse(JSON.stringify(place)) as BackendPlace;
  if (p.image_urls?.length) p.image_urls = p.image_urls.map((u) => swapMediaUri(u, httpToFile) as string);
  if (p.media?.length) {
    p.media = p.media.map((m) => ({
      ...m,
      url: swapMediaUri(m.url, httpToFile) as string,
      thumbnail_url: swapMediaUri(m.thumbnail_url, httpToFile) as string | null,
    }));
  }
  return p;
}

async function downloadUrlsToMap(
  urls: string[],
  entityFolder: string,
  entityId: string,
): Promise<Map<string, string>> {
  const httpToFile = new Map<string, string>();
  for (const absUrl of urls) {
    try {
      const dest = await localFileUriForDownloadedUrl(absUrl, entityFolder, entityId);
      let existing = await FileSystem.getInfoAsync(dest);
      // Una descarga previa interrumpida (app a segundo plano, señal débil) puede dejar
      // un archivo de 0 bytes que `exists` no distingue de uno válido; sin este chequeo
      // queda cacheado como "descargado" para siempre y nunca se reintenta.
      if (existing.exists && existing.size === 0) {
        await FileSystem.deleteAsync(dest, { idempotent: true });
        existing = await FileSystem.getInfoAsync(dest);
      }
      if (!existing.exists) {
        const res = await FileSystem.downloadAsync(absUrl, dest);
        if (res.status >= 400) {
          await FileSystem.deleteAsync(dest, { idempotent: true });
          continue;
        }
        const written = await FileSystem.getInfoAsync(dest);
        if (!written.exists || written.size === 0) {
          await FileSystem.deleteAsync(dest, { idempotent: true });
          continue;
        }
        httpToFile.set(absUrl, res.uri);
      } else {
        httpToFile.set(absUrl, existing.uri ?? dest);
      }
    } catch {
      /* omit failed asset */
    }
  }
  return httpToFile;
}

/**
 * Descarga imágenes del detalle del sendero al almacenamiento local y devuelve
 * una copia del detalle con `file://` para uso sin conexión.
 */
export async function cacheTrailDetailMediaForOffline(detail: TrailDetail): Promise<TrailDetail> {
  if (Platform.OS === 'web') return detail;
  const urls = collectTrailHttpUrls(detail);
  if (!urls.length) return detail;
  const map = await downloadUrlsToMap(urls, 'offline-trails', detail.id);
  return rewriteTrailDetail(detail, map);
}

/**
 * Igual que el sendero, para lugares descargados manualmente.
 */
export async function cachePlaceMediaForOffline(place: BackendPlace): Promise<BackendPlace> {
  if (Platform.OS === 'web') return place;
  const urls = collectPlaceHttpUrls(place);
  if (!urls.length) return place;
  const map = await downloadUrlsToMap(urls, 'offline-places', place.id);
  return rewritePlace(place, map);
}

export async function removeTrailOfflineMediaDir(trailId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const dir = `${FileSystem.documentDirectory}offline-trails/${trailId}/`;
  await FileSystem.deleteAsync(dir, { idempotent: true });
}

export async function removePlaceOfflineMediaDir(placeId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const dir = `${FileSystem.documentDirectory}offline-places/${placeId}/`;
  await FileSystem.deleteAsync(dir, { idempotent: true });
}
