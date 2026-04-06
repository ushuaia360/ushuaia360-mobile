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
  return media.filter((m) => DISPLAY_GALLERY_MEDIA.has(m.media_type) && (m.url || m.thumbnail_url));
}

export function mediaRowsToGallerySlides(media: GallerySourceRow[] | undefined): GallerySlide[] {
  if (!media?.length) return [];
  return media
    .filter((m) => DISPLAY_GALLERY_MEDIA.has(m.media_type) && (m.url || m.thumbnail_url))
    .map((m) => {
      const uri = (m.url || m.thumbnail_url) as string;
      if (m.media_type === 'photo_360') {
        return { uri, mode: 'panorama' as const };
      }
      if (m.media_type === 'photo_180') {
        return { uri, mode: 'panorama' as const, panoramaHalf: true };
      }
      return { uri, mode: 'image' as const };
    });
}

export function trailPointMediaToGallerySlides(media: TrailPointMedia[] | undefined): GallerySlide[] {
  return mediaRowsToGallerySlides(media);
}

export function placeMediaToGallerySlides(media: GallerySourceRow[] | undefined): GallerySlide[] {
  return mediaRowsToGallerySlides(media);
}

export function imageUrlsToGallerySlides(urls: string[]): GallerySlide[] {
  return urls.map((uri) => ({ uri, mode: 'image' as const }));
}
