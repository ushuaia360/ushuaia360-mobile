import * as TaskManager from 'expo-task-manager';

import { selectActiveSession, useActiveTrailSessionStore } from '@/store/active-trail-session-store';

/**
 * Nombre de la tarea de ubicación en segundo plano. Debe registrarse en el scope global
 * (no dentro de un componente) para que `expo-task-manager` la reconozca incluso si iOS
 * relanza la app en modo headless solo para entregar una actualización de ubicación.
 * Por eso este módulo se importa por su efecto secundario desde `app/_layout.tsx`.
 */
export const TRAIL_RECORDING_TASK = 'ushuaia360-trail-recording-task';

interface BackgroundLocationEvent {
  locations?: { coords: { latitude: number; longitude: number } }[];
}

TaskManager.defineTask(TRAIL_RECORDING_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as BackgroundLocationEvent | undefined)?.locations;
  if (!locations?.length) return;

  const store = useActiveTrailSessionStore.getState();
  if (!store.hydrated) await store.hydrate();

  const session = selectActiveSession(useActiveTrailSessionStore.getState());
  // Sin sesión activa o pausada: no hay dónde grabar (la tarea igual se detiene desde afuera,
  // pero por las dudas —p. ej. una entrega en vuelo justo al pausar— no acumulamos puntos.
  if (!session || session.paused) return;

  const newPoints = locations.map((l) => ({
    latitude: l.coords.latitude,
    longitude: l.coords.longitude,
  }));
  const existing = session.recordedPath ?? [];
  await useActiveTrailSessionStore.getState().updateActiveSession({
    recordedPath: [...existing, ...newPoints],
  });
});
