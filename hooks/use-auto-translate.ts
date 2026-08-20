import { useEffect, useState } from 'react';
import { translateText } from '@/services/translate';
import { useLanguageStore } from '@/store/language-store';

/**
 * Trail/POI/place descriptions are backend content authored once (in
 * Spanish) with no per-language storage, unlike the UI strings handled by
 * react-i18next. This translates that content client-side whenever the
 * app's language differs from the content's source language, showing the
 * original text until the (cached) translation resolves.
 */
export function useAutoTranslatedText(text: string | null | undefined, sourceLang: string = 'es'): string {
  const language = useLanguageStore((s) => s.language);
  const original = text?.trim() ?? '';
  const needsTranslation = Boolean(original) && language !== sourceLang;
  const [translated, setTranslated] = useState<string | null>(null);

  useEffect(() => {
    if (!needsTranslation) {
      setTranslated(null);
      return;
    }
    let cancelled = false;
    translateText(original, language, sourceLang).then((result) => {
      if (!cancelled) setTranslated(result);
    });
    return () => {
      cancelled = true;
    };
  }, [needsTranslation, original, language, sourceLang]);

  if (!needsTranslation) return original;
  return translated ?? original;
}
