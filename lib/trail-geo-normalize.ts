import type { TrailPointDetail } from '@/services/api';

/** Cubre GeoJSON Point, dict lat/lon del backend y strings numéricos. */
export function normalizeTrailPointLocation(
  loc: TrailPointDetail['location'],
): { latitude: number; longitude: number } | null {
  if (loc == null) return null;

  if (typeof loc === 'string') {
    try {
      const o = JSON.parse(loc) as unknown;
      return normalizeTrailPointLocation(o as TrailPointDetail['location']);
    } catch {
      return null;
    }
  }

  if (typeof loc !== 'object') return null;

  const o = loc as Record<string, unknown>;

  const latRaw = o.latitude ?? o.lat;
  const lonRaw = o.longitude ?? o.lng ?? o.lon;
  if (latRaw != null && lonRaw != null) {
    const latitude = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw));
    const longitude = typeof lonRaw === 'number' ? lonRaw : parseFloat(String(lonRaw));
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  if (o.type === 'Point' && Array.isArray(o.coordinates) && o.coordinates.length >= 2) {
    const longitude = Number(o.coordinates[0]);
    const latitude = Number(o.coordinates[1]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
}

/** Línea aproximada ordenada por order_index cuando no hay route_segments. */
export function buildLineFromTrailPoints(points: TrailPointDetail[]): { latitude: number; longitude: number }[] {
  const ordered = [...points].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );
  const out: { latitude: number; longitude: number }[] = [];
  for (const p of ordered) {
    const c = normalizeTrailPointLocation(p.location);
    if (c) out.push(c);
  }
  return out;
}
