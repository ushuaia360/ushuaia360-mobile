import type { TrailDetail, TrailRouteSegment } from '@/services/api';

/**
 * Mismo contrato que `ushuaia360-frontend` / Leaflet: cada par del path es [latitude, longitude].
 * GeoJSON LineString (si aparece) usa [lng, lat] y se convierte aquí.
 */
function toFinitePair(a: unknown, b: unknown): [number, number] | null {
  const x = typeof a === 'number' ? a : parseFloat(String(a));
  const y = typeof b === 'number' ? b : parseFloat(String(b));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

function parsePathPairs(path: unknown): [number, number][] {
  if (path && typeof path === 'object' && !Array.isArray(path)) {
    const o = path as { type?: string; coordinates?: unknown };
    if (o.type === 'LineString' && Array.isArray(o.coordinates)) {
      const out: [number, number][] = [];
      for (const item of o.coordinates) {
        if (Array.isArray(item) && item.length >= 2) {
          const p = toFinitePair(item[0], item[1]);
          if (p) out.push([p[1], p[0]]);
        }
      }
      return out;
    }
  }

  if (!Array.isArray(path)) return [];
  const out: [number, number][] = [];
  for (const item of path) {
    if (Array.isArray(item) && item.length >= 2) {
      const pair = toFinitePair(item[0], item[1]);
      if (pair) out.push(pair);
      continue;
    }
    if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      const lat = rec.latitude ?? rec.lat;
      const lon = rec.longitude ?? rec.lng ?? rec.lon;
      const pair = toFinitePair(lat, lon);
      if (pair) out.push(pair);
    }
  }
  return out;
}

function pathToLatLng(path: unknown): { latitude: number; longitude: number }[] {
  const pairs = parsePathPairs(path);
  if (pairs.length < 2) return [];
  return pairs.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
}

/**
 * @param _reference reservado por compatibilidad; el orden lat/lng viene del API ([lat,lng] como en admin).
 */
export function buildTrailLineCoordinates(
  detail: TrailDetail | null,
  _reference: { latitude: number; longitude: number },
): { latitude: number; longitude: number }[] {
  const segments = detail?.route_segments;
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const ordered = [...segments].sort(
    (a, b) => (a.segment_order ?? 0) - (b.segment_order ?? 0),
  );

  const out: { latitude: number; longitude: number }[] = [];
  for (const seg of ordered) {
    const part = pathToLatLng((seg as TrailRouteSegment).path);
    if (part.length === 0) continue;
    if (out.length === 0) {
      out.push(...part);
      continue;
    }
    const last = out[out.length - 1];
    const first = part[0];
    const dup =
      last.latitude === first.latitude && last.longitude === first.longitude;
    if (dup) out.push(...part.slice(1));
    else out.push(...part);
  }
  return out;
}
