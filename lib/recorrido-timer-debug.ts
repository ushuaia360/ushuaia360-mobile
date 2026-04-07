/**
 * Logs solo en desarrollo. Buscar en consola: `[recorrido-timer]`
 */
export function logRecorridoTimer(message: string, data?: unknown): void {
  if (!__DEV__) return;
  if (data !== undefined) {
    console.log(`[recorrido-timer] ${message}`, data);
  } else {
    console.log(`[recorrido-timer] ${message}`);
  }
}
