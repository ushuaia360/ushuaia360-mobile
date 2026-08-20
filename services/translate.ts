import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'translate_cache_v1:';
const MAX_CHUNK_CHARS = 450;

const memoryCache = new Map<string, string>();

function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return `${text.length}_${(h >>> 0).toString(36)}`;
}

function cacheKey(text: string, sourceLang: string, targetLang: string): string {
  return `${CACHE_PREFIX}${sourceLang}_${targetLang}_${hashText(text)}`;
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (let i = 0; i < sentence.length; i += maxChars) {
        chunks.push(sentence.slice(i, i + maxChars));
      }
      continue;
    }
    if (current && `${current} ${sentence}`.length > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(chunk: string, sourceLang: string, targetLang: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${sourceLang}|${targetLang}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate http ${res.status}`);
  const json = await res.json();
  const translated = json?.responseData?.translatedText;
  if (typeof translated !== 'string' || !translated.trim()) throw new Error('empty translation');
  return translated;
}

/**
 * Translates free text via MyMemory's free API (no key needed). Content
 * descriptions are authored once and rarely change, so results are cached
 * both in memory and AsyncStorage to avoid re-translating on every render
 * or app open. Falls back to the original text on any failure.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'es',
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || targetLang === sourceLang) return text;

  const key = cacheKey(trimmed, sourceLang, targetLang);
  const cached = memoryCache.get(key);
  if (cached) return cached;

  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      memoryCache.set(key, stored);
      return stored;
    }
  } catch {
    // ignore cache read errors, fall through to a live translation
  }

  try {
    const chunks = splitIntoChunks(trimmed, MAX_CHUNK_CHARS);
    const translatedChunks = await Promise.all(
      chunks.map((chunk) => translateChunk(chunk, sourceLang, targetLang)),
    );
    const result = translatedChunks.join(' ');
    memoryCache.set(key, result);
    AsyncStorage.setItem(key, result).catch(() => {});
    return result;
  } catch {
    return text;
  }
}
