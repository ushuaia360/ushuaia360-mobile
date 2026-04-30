import { Palette } from '@/constants/theme';
import { StyleSheet } from 'react-native';

/** Diámetro del disco exterior (coordenadas del mapa = centro del marcador). */
export const MAP_USER_LOCATION_DOT_DIAMETER = 22;

/** Punto de ubicación: compacto, borde celeste suave sombra discreta (home / overlay / recorrido). */
export const mapUserLocationDotStyles = StyleSheet.create({
  userDot: {
    width: MAP_USER_LOCATION_DOT_DIAMETER,
    height: MAP_USER_LOCATION_DOT_DIAMETER,
    borderRadius: MAP_USER_LOCATION_DOT_DIAMETER / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(63,169,245,0.42)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  userDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.primary,
  },
});
