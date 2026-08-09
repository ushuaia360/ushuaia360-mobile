export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteArrowPoint extends LatLng {
  /** Rumbo hacia el siguiente tramo, en grados (0° = norte, sentido horario). */
  bearingDeg: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Puntos equiespaciados (por distancia recorrida, no por cantidad de vértices) a lo largo de la
 * ruta, cada uno con el rumbo hacia el siguiente tramo — para dibujar flechas que indiquen el
 * sentido de recorrido (de inicio a fin del `path` guardado), ya que un trazado GPS por sí solo
 * no deja claro si se camina "de ida" o "de vuelta".
 */
export function computeRouteDirectionArrows(
  coords: LatLng[],
  opts: { minArrows?: number; maxArrows?: number; spacingMeters?: number } = {},
): RouteArrowPoint[] {
  if (coords.length < 2) return [];

  const cumulative: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineMeters(coords[i - 1], coords[i]));
  }
  const totalLength = cumulative[cumulative.length - 1];
  if (totalLength <= 0) return [];

  const { minArrows = 3, maxArrows = 8, spacingMeters = 500 } = opts;
  const arrowCount = Math.min(maxArrows, Math.max(minArrows, Math.round(totalLength / spacingMeters)));

  const pointAtDistance = (dist: number): RouteArrowPoint => {
    let i = 1;
    while (i < cumulative.length && cumulative[i] < dist) i++;
    i = Math.min(i, cumulative.length - 1);
    const segStart = coords[i - 1];
    const segEnd = coords[i];
    const segStartDist = cumulative[i - 1];
    const segLen = cumulative[i] - segStartDist;
    const t = segLen > 0 ? (dist - segStartDist) / segLen : 0;
    return {
      latitude: segStart.latitude + (segEnd.latitude - segStart.latitude) * t,
      longitude: segStart.longitude + (segEnd.longitude - segStart.longitude) * t,
      bearingDeg: bearingDeg(segStart, segEnd),
    };
  };

  const arrows: RouteArrowPoint[] = [];
  for (let i = 1; i <= arrowCount; i++) {
    arrows.push(pointAtDistance((totalLength * i) / (arrowCount + 1)));
  }
  return arrows;
}
