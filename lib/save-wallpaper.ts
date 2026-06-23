import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Share } from 'react-native';

import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';

function extensionFromUrl(url: string): string {
  const pathOnly = url.split('?')[0];
  const match = pathOnly.match(/\.(jpe?g|png|webp|heic|heif|gif)(\s*)$/i);
  if (match) return `.${match[1].toLowerCase()}`;
  return '.jpg';
}

function sanitizeFilename(title: string | null | undefined, id: string, ext: string): string {
  const base = (title ?? `ushuaia360-${id}`)
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 64);
  return `${base || `ushuaia360-${id}`}${ext}`;
}

export type SaveWallpaperResult = 'gallery' | 'share';

async function saveWithMediaLibrary(localUri: string): Promise<boolean> {
  try {
    const MediaLibrary = await import('expo-media-library');
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') {
      throw new Error('permission-denied');
    }
    await MediaLibrary.saveToLibraryAsync(localUri);
    return true;
  } catch {
    return false;
  }
}

async function shareDownloadedWallpaper(localUri: string): Promise<void> {
  const result = await Share.share(
    Platform.OS === 'ios'
      ? { url: localUri }
      : { message: localUri, url: localUri },
  );
  if (result.action === Share.dismissedAction) {
    throw new Error('share-dismissed');
  }
}

export async function saveWallpaperToDevice(
  url: string,
  options: { title?: string | null; id: string },
): Promise<SaveWallpaperResult> {
  const absUrl = resolveApiMediaUrl(url);
  if (!absUrl) throw new Error('URL de imagen inválida');

  const ext = extensionFromUrl(absUrl);
  const filename = sanitizeFilename(options.title, options.id, ext);

  if (Platform.OS === 'web') {
    const anchor = document.createElement('a');
    anchor.href = absUrl;
    anchor.download = filename;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return 'gallery';
  }

  const dest = `${FileSystem.cacheDirectory}${filename}`;
  const download = await FileSystem.downloadAsync(absUrl, dest);
  if (download.status !== 200) {
    throw new Error('No se pudo descargar la imagen.');
  }

  const savedToGallery = await saveWithMediaLibrary(download.uri);
  if (savedToGallery) return 'gallery';

  await shareDownloadedWallpaper(download.uri);
  return 'share';
}
