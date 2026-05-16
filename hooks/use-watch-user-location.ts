import { normalizeGeolocationHeading } from '@/lib/heading-utils';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface WgsPoint {
  latitude: number;
  longitude: number;
}

/** Fix de ubicación con rumbo GPS opcional (grado 0–360 desde el norte). */
export interface UserLocationFix extends WgsPoint {
  heading: number | null;
}

/**
 * Posición en vivo vía `expo-location`.
 * Si el módulo nativo no está disponible (dev build sin rebuild), retorna null silenciosamente.
 */
export function useWatchUserLocation(enabled: boolean): UserLocationFix | null {
  const [fix, setFix] = useState<UserLocationFix | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      setFix(null);
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      let Location: typeof import('expo-location');
      try {
        Location = require('expo-location');
      } catch {
        // Módulo nativo no disponible — necesita rebuild del dev build
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) {
        if (!cancelled) setFix(null);
        return;
      }

      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setFix({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
            heading: normalizeGeolocationHeading(initial.coords.heading),
          });
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 8,
            timeInterval: 2000,
          },
          (pos) => {
            if (!cancelled) {
              setFix({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                heading: normalizeGeolocationHeading(pos.coords.heading),
              });
            }
          },
        );
      } catch {
        if (!cancelled) setFix(null);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return fix;
}
