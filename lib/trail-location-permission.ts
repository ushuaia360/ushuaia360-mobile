import { Alert, PermissionsAndroid, Platform } from 'react-native';

/**
 * Permisos para el mapa con el usuario en pantalla, sin `expo-location`
 * (evita el error "Cannot find native module 'ExpoLocation'" si el dev client
 * o Expo Go no incluye ese módulo).
 *
 * - Android: solicitud explícita en tiempo de ejecución.
 * - iOS: el aviso del sistema suele aparecer al usar `showsUserLocation` en MapView
 *   si `NSLocationWhenInUseUsageDescription` está en el Info.plist.
 */
export async function ensureTrailMapLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Ubicación',
          message:
            'Ushuaia360 usa tu ubicación para mostrarte en el mapa mientras hacés un sendero.',
          buttonPositive: 'Aceptar',
          buttonNegative: 'Cancelar',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  return true;
}

export function alertLocationDenied(): void {
  Alert.alert(
    'Ubicación',
    'Para ver tu posición en el mapa necesitamos permiso de ubicación. Podés activarlo en Ajustes.',
    [{ text: 'Entendido' }],
  );
}
