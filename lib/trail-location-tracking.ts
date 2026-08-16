import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { appendRecordedPoints, TRAIL_RECORDING_TASK } from '@/lib/trail-recording-task';

/**
 * Android: sin permiso de ubicación en segundo plano (no lo pedimos). Grabamos solo mientras
 * la app está en primer plano con un `watchPositionAsync` normal — se corta solo al minimizar
 * la app o bloquear la pantalla, que es lo que queremos (no grabar recorrido sin uso activo).
 */
let androidWatchSubscription: Location.LocationSubscription | null = null;

/**
 * Arranca (o reanuda, si ya estaba activa) la grabación de ubicación del recorrido activo.
 * iOS: `startLocationUpdatesAsync` en segundo plano (sigue entregando puntos con la app
 * minimizada o el celular bloqueado). Android: solo primer plano, ver `androidWatchSubscription`.
 * Idempotente: si ya está corriendo, no hace nada.
 */
export async function startTrailLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') return;

    if (Platform.OS === 'android') {
      if (androidWatchSubscription) return;
      androidWatchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 8,
          timeInterval: 2000,
        },
        (loc) => {
          void appendRecordedPoints([
            { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          ]);
        },
      );
      return;
    }

    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(TRAIL_RECORDING_TASK);
    if (alreadyRunning) return;
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
    /* sin ubicación: la app sigue funcionando, solo no graba el recorrido */
  }
}

/** Para la grabación. Idempotente: si no estaba corriendo, no hace nada. */
export async function stopTrailLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android') {
      androidWatchSubscription?.remove();
      androidWatchSubscription = null;
      return;
    }
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(TRAIL_RECORDING_TASK);
    if (!alreadyRunning) return;
    await Location.stopLocationUpdatesAsync(TRAIL_RECORDING_TASK);
  } catch {
    /* no-op */
  }
}
