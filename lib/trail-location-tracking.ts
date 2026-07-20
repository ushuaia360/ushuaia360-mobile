import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { TRAIL_RECORDING_TASK } from '@/lib/trail-recording-task';

/**
 * Arranca (o reanuda, si ya estaba activa) la grabación de ubicación en segundo plano del
 * recorrido activo. Usa `startLocationUpdatesAsync` (no `watchPositionAsync`): sigue entregando
 * puntos con la app minimizada o el celular bloqueado, no solo en foreground.
 * Idempotente: si ya está corriendo, no hace nada.
 */
export async function startTrailLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(TRAIL_RECORDING_TASK);
    if (alreadyRunning) return;

    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') return;
    // El permiso "Siempre" es deseable para que el SO no corte la grabación en segundo plano,
    // pero no es obligatorio: sin él igual grabamos mientras la app esté activa/foreground.
    await Location.requestBackgroundPermissionsAsync().catch(() => null);

    await Location.startLocationUpdatesAsync(TRAIL_RECORDING_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 8,
      timeInterval: 2000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Ushuaia360',
        notificationBody: 'Grabando tu recorrido…',
      },
    });
  } catch {
    /* sin ubicación en background: la app sigue funcionando, solo no graba el recorrido */
  }
}

/** Para la grabación en segundo plano. Idempotente: si no estaba corriendo, no hace nada. */
export async function stopTrailLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(TRAIL_RECORDING_TASK);
    if (!alreadyRunning) return;
    await Location.stopLocationUpdatesAsync(TRAIL_RECORDING_TASK);
  } catch {
    /* no-op */
  }
}
