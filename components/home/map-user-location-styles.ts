import { StyleSheet } from 'react-native';

export const MAP_USER_DOT_BLUE = '#4285F4';

/** Punto bien visible en mapas (home / recorrido). */
export const mapUserLocationDotStyles = StyleSheet.create({
  userDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 6,
  },
  userDotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: MAP_USER_DOT_BLUE,
  },
});
