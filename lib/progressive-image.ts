import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabaseThumbnailUrl } from '@/lib/supabase-image-transform';

export interface ProgressiveTier {
  width: number;
  quality: number;
}

/**
 * Escalones de calidad creciente (más chico/comprimido primero) hasta `finalUrl`. Se usa para
 * mostrar la foto en mala calidad casi al instante y reemplazarla progresivamente a medida que
 * cargan versiones mejores, en vez de esperar en blanco a la imagen final. Solo funciona para
 * imágenes servidas desde Supabase Storage (`supabaseThumbnailUrl` devuelve la URL sin cambios
 * para cualquier otro host, así que ahí el array queda con un solo escalón: la imagen final).
 */
export function buildProgressiveStages(
  finalUrl: string | null | undefined,
  tiers: ProgressiveTier[],
): string[] {
  if (!finalUrl) return [];
  const lowerStages = tiers
    .map((tier) => supabaseThumbnailUrl(finalUrl, { width: tier.width, quality: tier.quality, resize: 'cover' }))
    .filter((u): u is string => !!u && u !== finalUrl);
  return [...new Set(lowerStages), finalUrl];
}

/**
 * Maneja el avance por los escalones de `buildProgressiveStages`: arranca en la calidad más baja
 * y sube de a una al disparar `advance` (pensado para el `onLoad` del `<Image>`). Si algún
 * escalón falla (p. ej. la transformación de imágenes de Supabase no está habilitada en el
 * proyecto y el endpoint `/render/image` devuelve error), `onError` salta directo a `finalUrl`
 * en vez de dejar la imagen rota.
 */
export function useProgressiveImageSource(finalUrl: string | null | undefined, tiers: ProgressiveTier[]) {
  const stages = useMemo(() => buildProgressiveStages(finalUrl, tiers), [finalUrl, tiers]);
  const [stageIndex, setStageIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setStageIndex(0);
    setFailed(false);
  }, [finalUrl]);

  const lastIndex = Math.max(stages.length - 1, 0);
  const src = failed ? finalUrl ?? null : stages[stageIndex] ?? finalUrl ?? null;
  const isLowQuality = !failed && stageIndex < lastIndex;

  const advance = useCallback(() => {
    setStageIndex((i) => Math.min(i + 1, lastIndex));
  }, [lastIndex]);

  const onError = useCallback(() => {
    setFailed(true);
  }, []);

  return { src, isLowQuality, advance, onError };
}
