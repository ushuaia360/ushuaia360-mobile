/**
 * Generates a resized/compressed version of a Supabase Storage URL using its
 * built-in image rendering API (/storage/v1/render/image/public/...).
 * Returns the original URL unchanged for any non-Supabase URL.
 */
export function supabaseThumbnailUrl(
  url: string | null | undefined,
  opts: { width?: number; quality?: number; resize?: 'cover' | 'contain' | 'fill' } = {},
): string | null {
  if (!url) return null;
  const match = url.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/(.+)$/);
  if (!match) return url;
  const [, base, path] = match;
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.quality) params.set('quality', String(opts.quality));
  if (opts.resize) params.set('resize', opts.resize);
  const qs = params.toString();
  return `${base}/storage/v1/render/image/public/${path}${qs ? `?${qs}` : ''}`;
}
