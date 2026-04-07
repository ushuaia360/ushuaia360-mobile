/**
 * Normaliza `started_at` del backend o AsyncStorage: evita tratar Unix **segundos** como ms
 * (Date(segundos) → 1970 y ~500k horas de diferencia con now).
 */
export function sessionStartedAtToMs(startedAt: unknown): number {
  if (startedAt == null) return Date.now();
  if (typeof startedAt === 'number') {
    const ms = startedAt > 1e12 ? startedAt : startedAt * 1000;
    return Number.isFinite(ms) ? ms : Date.now();
  }
  if (typeof startedAt === 'object' && startedAt !== null && !Array.isArray(startedAt)) {
    const o = startedAt as Record<string, unknown>;
    const sec =
      typeof o.seconds === 'number'
        ? o.seconds
        : typeof o._seconds === 'number'
          ? o._seconds
          : typeof o.Seconds === 'number'
            ? o.Seconds
            : null;
    if (sec != null && Number.isFinite(sec)) {
      const ms = sec > 1e12 ? sec : sec * 1000;
      return Number.isFinite(ms) ? ms : Date.now();
    }
  }
  if (typeof startedAt === 'string') {
    const trimmed = startedAt.trim();
    if (!trimmed) return Date.now();
    let forParse = trimmed;
    if (/^\d{4}-\d{2}-\d{2} \d/.test(trimmed)) {
      forParse = trimmed.replace(' ', 'T');
    }
    const parsed = Date.parse(forParse);
    if (!Number.isNaN(parsed)) return parsed;
    const n = Number(trimmed);
    if (!Number.isNaN(n)) {
      const ms = n > 1e12 ? n : n * 1000;
      return Number.isFinite(ms) ? ms : Date.now();
    }
  }
  return Date.now();
}

export function normalizeSessionStartedAtToISO(startedAt: unknown): string {
  return new Date(sessionStartedAtToMs(startedAt)).toISOString();
}
