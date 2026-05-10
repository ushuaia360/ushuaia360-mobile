import { API_BASE_URL } from '@/constants/api';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Sin módulos nativos (NetInfo / expo-network): evita crashes si el binario
 * no incluye RNCNetInfo o ExpoNetwork.
 *
 * - Web: `navigator.onLine` + eventos online/offline.
 * - iOS/Android: ping HTTP liviano al API (`/map/markers`). Solo se considera
 *   alcanzable si la respuesta es 2xx (`res.ok`); evita marcar «online» con 502
 *   del proxy o respuestas de error.
 */

const POLL_MS = 10_000;

type ReachListener = (v: boolean | null) => void;
const reachListeners = new Set<ReachListener>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

/** Último resultado del ping (o `navigator.onLine` en web). Para suscriptores que montan después del primer ping. */
let lastNotifiedReachable: boolean | null = null;

function notifyReachable(v: boolean | null) {
  lastNotifiedReachable = v;
  reachListeners.forEach((l) => l(v));
}

async function pingBackendReachable(): Promise<boolean> {
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}/map/markers`;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 6000);
  try {
    const res = await fetch(url, { method: 'GET', signal: ac.signal });
    clearTimeout(to);
    // `fetch` puede completar con 502/503 del proxy o respuesta local sin API real: solo «online» con 2xx.
    return res.ok;
  } catch {
    clearTimeout(to);
    return false;
  }
}

function startNativePollingIfNeeded() {
  if (pollTimer != null) return;
  void (async () => {
    const ok = await pingBackendReachable();
    notifyReachable(ok);
  })();
  pollTimer = setInterval(() => {
    void (async () => {
      const ok = await pingBackendReachable();
      notifyReachable(ok);
    })();
  }, POLL_MS);
}

function stopNativePollingIfNoListeners() {
  if (reachListeners.size > 0) return;
  if (pollTimer != null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * `true` si hay red hacia el API; `false` si el ping falla o aún no se comprobó (nativo: pesimista hasta el 1er ping).
 * Web: sigue `navigator.onLine` (puede ser optimista).
 */
function getNativeInitialReachable(): boolean | null {
  // Sin medición previa: asumimos sin API hasta el primer ping (evita home «online» vacío al primer arranque sin red).
  if (lastNotifiedReachable !== null) return lastNotifiedReachable;
  return false;
}

export function useNetworkReachable(): boolean | null {
  const [reachable, setReachable] = useState<boolean | null>(() =>
    Platform.OS === 'web' ? lastNotifiedReachable : getNativeInitialReachable(),
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined') {
        const onLine = navigator.onLine;
        lastNotifiedReachable = onLine;
        setReachable(onLine);
        const onChange = () => {
          const v = navigator.onLine;
          lastNotifiedReachable = v;
          setReachable(v);
        };
        window.addEventListener('online', onChange);
        window.addEventListener('offline', onChange);
        return () => {
          window.removeEventListener('online', onChange);
          window.removeEventListener('offline', onChange);
        };
      }
      lastNotifiedReachable = true;
      setReachable(true);
      return;
    }

    const listener: ReachListener = setReachable;
    reachListeners.add(listener);
    startNativePollingIfNeeded();
    // Si el ping ya terminó antes de montar esta pantalla, alineamos estado (evita quedar en `null` hasta el próximo poll).
    if (lastNotifiedReachable !== null) {
      setReachable(lastNotifiedReachable);
    }
    return () => {
      reachListeners.delete(listener);
      stopNativePollingIfNoListeners();
    };
  }, []);

  return reachable;
}
