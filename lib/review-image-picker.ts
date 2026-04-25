import { REVIEW_GALLERY_MAX_PHOTOS } from '@/lib/review-constants';
import { Alert } from 'react-native';

type ImagePickerModule = typeof import('expo-image-picker');
type DocumentPickerModule = typeof import('expo-document-picker');

/** Metro / interop: exports a veces vienen en `.default`. */
function resolveNamespace<T extends Record<string, unknown>>(
  loaded: unknown,
  key: keyof T & string,
): T | null {
  if (!loaded || typeof loaded !== 'object') return null;
  const root = loaded as Record<string, unknown>;
  if (typeof root[key] === 'function') {
    return loaded as T;
  }
  const def = root.default;
  if (def && typeof def === 'object' && typeof (def as Record<string, unknown>)[key] === 'function') {
    return def as T;
  }
  return null;
}

/**
 * Misma idea que **nuddo-mobile** `ImageDropzoneMobile.pickFromLibrary`: abrir la galería con
 * `launchImageLibraryAsync` **sin** llamar antes a `requestMediaLibraryPermissionsAsync` (el sistema
 * / photo picker suele manejar permisos al vuelo).
 *
 * Import dinámico para no cargar el nativo al abrir pantallas que solo importan este módulo.
 * Si `expo-image-picker` falla, se usa **expo-document-picker** como respaldo.
 */
export async function pickReviewImagesToAppend(existing: string[]): Promise<string[] | null> {
  const remaining = REVIEW_GALLERY_MAX_PHOTOS - existing.length;
  if (remaining <= 0) return null;

  const merge = (uris: string[]) => [...existing, ...uris].slice(0, REVIEW_GALLERY_MAX_PHOTOS);

  try {
    try {
      const rawIp = await import('expo-image-picker');
      const ImagePicker = resolveNamespace<ImagePickerModule>(rawIp, 'launchImageLibraryAsync');
      if (ImagePicker) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.8,
          selectionLimit: remaining,
        });
        if (result.canceled) return null;
        const uris = (result.assets ?? [])
          .map((a) => a.uri)
          .filter(Boolean)
          .slice(0, remaining);
        if (uris.length === 0) return null;
        return merge(uris);
      }
    } catch {
      /* seguir al document picker */
    }

    const rawDp = await import('expo-document-picker');
    const DocumentPicker = resolveNamespace<DocumentPickerModule>(rawDp, 'getDocumentAsync');
    if (!DocumentPicker) {
      Alert.alert(
        'Fotos',
        'No se pudo cargar ningún selector de imágenes. Reinstalá dependencias y recompilá (npx expo prebuild && npx expo run:ios o run:android).',
      );
      return null;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: remaining > 1,
      base64: false,
    });

    if (result.canceled || !result.assets?.length) return null;

    const uris = result.assets
      .map((a) => a.uri)
      .filter(Boolean)
      .slice(0, remaining);

    if (uris.length === 0) return null;
    return merge(uris);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const missingNative =
      raw.includes('ExpoDocumentPicker') ||
      raw.includes('ExponentImagePicker') ||
      raw.includes('Cannot find native module') ||
      raw.includes('Native module') ||
      raw.includes('UnavailabilityError');

    const msg = missingNative
      ? 'Los módulos nativos de fotos no están en esta app. Usá un build generado con este proyecto (npx expo prebuild && npx expo run:ios / run:android o EAS), misma versión de Expo SDK que package.json.'
      : raw || 'No se pudo elegir la imagen.';

    Alert.alert('Fotos', msg);
    return null;
  }
}
