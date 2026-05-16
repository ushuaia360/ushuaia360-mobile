import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './locales/es.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

export type AppLanguage = 'es' | 'en' | 'pt';

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['es', 'en', 'pt'];

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
};

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en }, pt: { translation: pt } },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
