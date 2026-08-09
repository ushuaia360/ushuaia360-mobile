import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import type { TrailPointMedia } from '@/services/api';

export type GallerySlide = {
  uri: string;
  mode: 'image' | 'panorama';
  /** `photo_180`: limita el giro horizontal */
  panoramaHalf?: boolean;
};

export type GallerySourceRow = Pick<TrailPointMedia, 'media_type' | 'url' | 'thumbnail_url'>;

/** Tipos de archivo que se muestran en galerías de la app (excl. video por ahora). */
const DISPLAY_GALLERY_MEDIA = new Set(['image', 'photo_360', 'photo_180']);

export function filterDisplayableMedia<T extends GallerySourceRow>(media: T[] | undefined): T[] {
  if (!media?.length) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const m of media) {
    if (!DISPLAY_GALLERY_MEDIA.has(m.media_type) || (!m.url && !m.thumbnail_url)) continue;
    // Misma nota que en `mediaRowsToGallerySlides`: filas duplicadas de la misma foto
    // no deben mostrarse repetidas.
    const key = (m.url || m.thumbnail_url) as string;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(m);
  }
  return result;
}

export function mediaRowsToGallerySlides(media: GallerySourceRow[] | undefined): GallerySlide[] {
  if (!media?.length) return [];
  const seen = new Set<string>();
  const slides: GallerySlide[] = [];
  for (const m of media) {
    if (!DISPLAY_GALLERY_MEDIA.has(m.media_type) || (!m.url && !m.thumbnail_url)) continue;
    const raw = (m.url || m.thumbnail_url) as string;
    const uri = resolveApiMediaUrl(raw) ?? raw;
    // La misma foto puede aparecer más de una vez en `media` (p. ej. filas duplicadas
    // cargadas desde el admin); sin este filtro se ve repetida en la galería y, al
    // descargar el sendero, esa duplicación queda grabada para siempre en el paquete offline.
    if (seen.has(uri)) continue;
    seen.add(uri);
    if (m.media_type === 'photo_360') {
      slides.push({ uri, mode: 'panorama' });
    } else if (m.media_type === 'photo_180') {
      slides.push({ uri, mode: 'panorama', panoramaHalf: true });
    } else {
      slides.push({ uri, mode: 'image' });
    }
  }
  return slides;
}

export function trailPointMediaToGallerySlides(media: TrailPointMedia[] | undefined): GallerySlide[] {
  return mediaRowsToGallerySlides(media);
}

export function placeMediaToGallerySlides(media: GallerySourceRow[] | undefined): GallerySlide[] {
  return mediaRowsToGallerySlides(media);
}

export function imageUrlsToGallerySlides(urls: string[]): GallerySlide[] {
  return [...new Set(urls)].map((uri) => ({ uri, mode: 'image' as const }));
}
