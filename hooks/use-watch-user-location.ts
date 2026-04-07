import { normalizeGeolocationHeading } from '@/lib/heading-utils';
import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

export interface WgsPoint {
  latitude: number;
  longitude: number;
}

/** Fix de ubicación con rumbo GPS opcional (grado 0–360 desde el norte). */
export interface UserLocationFix extends WgsPoint {
  heading: number | null;
}

async function ensureAndroidFineLocation(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Ubicación',
        message: 'Ushuaia360 usa tu ubicación para mostrarte en el mapa.',
        buttonPositive: 'Aceptar',
        buttonNegative: 'Cancelar',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

function coordsHeading(coords: {
  heading?: number | null;
}): number | null {
  if (coords.heading === undefined || coords.heading === null) return null;
  return normalizeGeolocationHeading(coords.heading);
}

/**
 * Posición en vivo vía `@react-native-community/geolocation` (sin `expo-location` / módulo `ExpoLocation`).
 * Incluye `heading` del GPS cuando el SO lo informa (suele requerir movimiento).
 */
export function useWatchUserLocation(enabled: boolean): UserLocationFix | null {
  const [fix, setFix] = useState<UserLocationFix | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      setFix(null);
      return;
    }

    let watchId: number | null = null;
    let cancelled = false;

    void (async () => {
      const ok = await ensureAndroidFineLocation();
      if (!ok || cancelled) {
        if (!cancelled) setFix(null);
        return;
      }

      let Geolocation: typeof import('@react-native-community/geolocation').default;
      try {
        Geolocation = require('@react-native-community/geolocation').default;
      } catch {
        if (!cancelled) setFix(null);
        return;
      }

      try {
        Geolocation.requestAuthorization?.();

        Geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) {
              setFix({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                heading: coordsHeading(pos.coords),
              });
            }
          },
          () => {
            if (!cancelled) setFix(null);
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 },
        );

        watchId = Geolocation.watchPosition(
          (pos) => {
            if (!cancelled) {
              setFix({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                heading: coordsHeading(pos.coords),
              });
            }
          },
          () => {},
          {
            enableHighAccuracy: true,
            distanceFilter: 8,
            interval: 2000,
            fastestInterval: 1500,
          },
        );
      } catch {
        if (!cancelled) setFix(null);
      }
    })();

    return () => {
      cancelled = true;
      if (watchId != null) {
        try {
          const Geolocation = require('@react-native-community/geolocation').default;
          Geolocation.clearWatch(watchId);
        } catch {
          /* noop */
        }
      }
    };
  }, [enabled]);

  return fix;
}
