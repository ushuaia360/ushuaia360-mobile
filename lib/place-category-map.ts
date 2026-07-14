import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type IonName = ComponentProps<typeof Ionicons>['name'];

/**
 * Categorías de puntos turísticos (admin + API): slugs o etiquetas en español.
 * @see ushuaia360-frontend `placeCategories.ts`
 */
export type PlaceCategoryKey =
  | 'turismo'
  | 'naturaleza'
  | 'historia'
  | 'miradores'
  | 'costa'
  | 'gastronomia'
  | 'hospedaje'
  | 'compras'
  | 'otros';

/**
 * Orden canónico en el que se muestran las categorías (grid del home, filtros, etc).
 * "otros" queda fuera a propósito: sigue existiendo como fallback interno de
 * `normalizePlaceCategoryKey` para datos nulos/sin match, pero no es una opción navegable.
 */
export const PLACE_CATEGORY_ORDER: PlaceCategoryKey[] = [
  'turismo',
  'naturaleza',
  'historia',
  'miradores',
  'costa',
  'gastronomia',
  'hospedaje',
  'compras',
];

const VISUAL: Record<
  PlaceCategoryKey,
  { icon: IonName; pinColor: string; pinColorDark: string }
> = {
  turismo: { icon: 'compass', pinColor: '#4f46e5', pinColorDark: '#818cf8' },
  naturaleza: { icon: 'leaf', pinColor: '#059669', pinColorDark: '#34d399' },
  historia: { icon: 'library', pinColor: '#d97706', pinColorDark: '#fbbf24' },
  miradores: { icon: 'eye', pinColor: '#0284c7', pinColorDark: '#38bdf8' },
  costa: { icon: 'water', pinColor: '#0891b2', pinColorDark: '#22d3ee' },
  gastronomia: { icon: 'restaurant', pinColor: '#ea580c', pinColorDark: '#fb923c' },
  hospedaje: { icon: 'bed', pinColor: '#0d9488', pinColorDark: '#2dd4bf' },
  compras: { icon: 'bag-handle', pinColor: '#e11d48', pinColorDark: '#fb7185' },
  otros: { icon: 'location', pinColor: '#6b7280', pinColorDark: '#9ca3af' },
};

const KEY_LABEL: Record<PlaceCategoryKey, string> = {
  turismo: 'Turismo',
  naturaleza: 'Naturaleza',
  historia: 'Historia',
  miradores: 'Miradores',
  costa: 'Costa y mar',
  gastronomia: 'Gastronomía',
  hospedaje: 'Hospedaje',
  compras: 'Compras',
  otros: 'Otros',
};

/** Etiqueta legible en español para la categoría normalizada. */
export function formatPlaceCategoryLabel(raw: string | null | undefined): string {
  return KEY_LABEL[normalizePlaceCategoryKey(raw)];
}

const SLUGS = new Set<string>(Object.keys(VISUAL));

/**
 * Pasa `category` tal cual venga del API (slug, etiqueta, mayúsculas).
 * Incluye compatibilidad con slugs antiguos (turistico, patrimonio, cultura)
 * que ya no se ofrecen como opción pero pueden existir en registros previos.
 */
export function normalizePlaceCategoryKey(
  raw: string | null | undefined,
): PlaceCategoryKey {
  if (raw == null || !String(raw).trim()) return 'otros';
  const t = String(raw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (SLUGS.has(t)) return t as PlaceCategoryKey;

  if (t.includes('turis')) return 'turismo';
  if (t.includes('naturaleza')) return 'naturaleza';
  if (t.includes('patrimonio') || t.includes('historia')) return 'historia';
  if (t.includes('mirador')) return 'miradores';
  if (t.includes('costa') || t.includes(' mar')) return 'costa';
  if (t.includes('gastronom')) return 'gastronomia';
  if (t.includes('hospedaje') || t.includes('hotel') || t.includes('alojamiento')) return 'hospedaje';
  if (t.includes('servicio') || t.includes('compra')) return 'compras';
  if (t === 'otros' || t.includes('otro') || t.includes('cultura')) return 'otros';

  return 'otros';
}

export function getPlaceCategoryVisual(
  category: string | null | undefined,
  isDark: boolean,
): { icon: IonName; accent: string; key: PlaceCategoryKey } {
  const key = normalizePlaceCategoryKey(category);
  const v = VISUAL[key];
  return {
    key,
    icon: v.icon,
    accent: isDark ? v.pinColorDark : v.pinColor,
  };
}
