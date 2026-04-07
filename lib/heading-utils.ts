/** Normaliza el rumbo que viene del GPS (0–360° desde el norte verdadero). */
export function normalizeGeolocationHeading(h: number | null | undefined): number | null {
  if (h == null || Number.isNaN(h)) return null;
  if (h < 0) return null;
  return ((h % 360) + 360) % 360;
}

/** Rosa de 8 vientos, en español (O = oeste). */
export function headingToCardinal8(degrees: number): string {
  const d = ((degrees % 360) + 360) % 360;
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;
  const idx = Math.round(d / 45) % 8;
  return labels[idx];
}
