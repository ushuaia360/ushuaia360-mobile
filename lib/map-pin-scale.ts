/**
 * Escala visual de pins de mapa según zoom (tile Android) o span de región (MapView iOS / recorrido).
 */

/** Android home: `committed.zoom` entre minZ y maxZ. */
export function pinScaleFromTileZoom(zoom: number, minZ = 11, maxZ = 18): number {
  const t = (zoom - minZ) / (maxZ - minZ);
  const clamped = Math.max(0, Math.min(1, t));
  return 0.62 + clamped * 0.48;
}

/** Mapa inicio (iOS): pins más grandes que el mismo span en recorrido. */
export function homePinScaleFromRegionSpan(delta: number): number {
  const base = pinScaleFromRegionSpan(delta);
  return Math.min(1.5, base * 1.22);
}

/**
 * iOS / región MapView: `max(latitudeDelta, longitudeDelta)`.
 * Delta pequeño → zoom alto → pin grande.
 */
export function pinScaleFromRegionSpan(delta: number): number {
  const d = Math.min(Math.max(delta, 0.002), 1.2);
  const lo = 0.004;
  const hi = 0.55;
  const t = (Math.log(d) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - clamped * 0.58;
}
