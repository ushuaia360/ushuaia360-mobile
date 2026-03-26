import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type PoiIonIcon = ComponentProps<typeof Ionicons>['name'];

/** Icono según `trail_points.type` (alineado con admin / backend). */
export function poiTypeIcon(type: string | null | undefined): PoiIonIcon {
  const t = (type || '').toLowerCase();
  const map: Record<string, PoiIonIcon> = {
    inicio: 'play-circle',
    fin: 'flag',
    mirador: 'eye',
    peligro: 'warning',
    agua: 'water',
    descanso: 'cafe',
    refugio: 'home',
    cruce: 'navigate',
    campamento: 'bonfire',
    cascada: 'rainy',
    vista: 'sunny',
    informacion: 'information-circle',
  };
  return map[t] ?? 'location';
}
