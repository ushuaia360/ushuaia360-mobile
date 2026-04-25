/**
 * Compresión de fotos para subida (paridad con ushuaia360-frontend `src/lib/image.ts`):
 * tope ~2048px en el lado mayor, calidad ~0.86, salida WebP cuando el manipulador lo permite.
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';

export type CompressOptions = {
  maxSide?: number;
  quality?: number;
};

const DEFAULT_MAX_SIDE = 2048;
const DEFAULT_QUALITY = 0.86;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err ?? new Error('No se pudo leer la imagen')),
    );
  });
}

/**
 * Devuelve un `file://` (o equivalente) listo para multipart upload.
 * En Android el picker suele devolver `content://`; `Image.getSize` a veces falla ahí,
 * pero `manipulateAsync` sí puede leer el mismo URI.
 */
export async function compressReviewPhotoForUpload(
  localUri: string,
  options: CompressOptions = {},
): Promise<string> {
  const maxSide = options.maxSide ?? DEFAULT_MAX_SIDE;
  const quality = options.quality ?? DEFAULT_QUALITY;

  let actions: { resize: { width: number } }[] = [];

  try {
    const { width, height } = await getImageSize(localUri);
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    if (scale < 1) actions = [{ resize: { width: targetW } }];
  } catch {
    actions = [{ resize: { width: maxSide } }];
  }

  const result = await manipulateAsync(localUri, actions, {
    compress: quality,
    format: SaveFormat.WEBP,
  });

  return result.uri;
}
