import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type IonName = ComponentProps<typeof Ionicons>['name'];

/**
 * Categorías de puntos turísticos (admin + API): slugs o etiquetas en español.
 * @see ushuaia360-frontend `placeCategories.ts`
 */
export type PlaceCategoryKey =
  | 'turistico'
  | 'naturaleza'
  | 'patrimonio'
  | 'miradores'
  | 'costa'
  | 'cultura'
  | 'gastronomia'
  | 'otros';

const VISUAL: Record<
  PlaceCategoryKey,
  { icon: IonName; pinColor: string; pinColorDark: string }
> = {
  turistico: { icon: 'trail-sign', pinColor: '#2563eb', pinColorDark: '#60a5fa' },
  naturaleza: { icon: 'leaf', pinColor: '#059669', pinColorDark: '#34d399' },
  patrimonio: { icon: 'library', pinColor: '#d97706', pinColorDark: '#fbbf24' },
  miradores: { icon: 'eye', pinColor: '#0284c7', pinColorDark: '#38bdf8' },
  costa: { icon: 'water', pinColor: '#0891b2', pinColorDark: '#22d3ee' },
  cultura: { icon: 'color-palette', pinColor: '#7c3aed', pinColorDark: '#a78bfa' },
  gastronomia: { icon: 'restaurant', pinColor: '#ea580c', pinColorDark: '#fb923c' },
  otros: { icon: 'location', pinColor: '#6b7280', pinColorDark: '#9ca3af' },
};

const KEY_LABEL: Record<PlaceCategoryKey, string> = {
  turistico: 'Turístico',
  naturaleza: 'Naturaleza',
  patrimonio: 'Patrimonio e historia',
  miradores: 'Miradores',
  costa: 'Costa y mar',
  cultura: 'Cultura',
  gastronomia: 'Gastronomía',
  otros: 'Otros',
};

/** Etiqueta legible en español para la categoría normalizada. */
export function formatPlaceCategoryLabel(raw: string | null | undefined): string {
  return KEY_LABEL[normalizePlaceCategoryKey(raw)];
}

const SLUGS = new Set<string>(Object.keys(VISUAL));

/**
 * Pasa `category` tal cual venga del API (slug, etiqueta, mayúsculas).
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

  if (t.includes('turistic')) return 'turistico';
  if (t.includes('naturaleza')) return 'naturaleza';
  if (t.includes('patrimonio') || t.includes('historia')) return 'patrimonio';
  if (t.includes('mirador')) return 'miradores';
  if (t.includes('costa') || t.includes(' mar')) return 'costa';
  if (t.includes('cultura')) return 'cultura';
  if (t.includes('gastronom')) return 'gastronomia';
  if (t === 'otros' || t.includes('otro')) return 'otros';

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
