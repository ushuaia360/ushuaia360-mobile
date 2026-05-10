import { ApiHttpError } from '@/services/api';

/**
 * Heurística para fallos de transporte (sin respuesta HTTP útil).
 * No incluye 4xx/5xx con cuerpo: esos son `ApiHttpError`.
 */
export function isLikelyNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  if (e != null && typeof e === 'object' && 'name' in e && (e as { name?: string }).name === 'AbortError') {
    return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/network|failed to fetch|internet|aborted|timeout|load failed|unable to resolve/i.test(msg)) {
    return true;
  }
  return false;
}

/**
 * Finalización de recorrido: reintentar en cola cuando el fallo suele ser transitorio (red / 5xx).
 */
export function shouldQueueTrailCompletionError(e: unknown): boolean {
  if (isLikelyNetworkError(e)) return true;
  if (e instanceof ApiHttpError) {
    if (e.status === 401 || e.status === 403) return false;
    if (e.status >= 500 && e.status < 600) return true;
    const m = (e.message || '').toLowerCase();
    if (
      m.includes('server error') ||
      m.includes('internal server') ||
      m.includes('bad gateway') ||
      m.includes('service unavailable') ||
      m.includes('gateway timeout')
    ) {
      return true;
    }
  }
  return false;
}
