import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { type AppLanguage, SUPPORTED_LANGUAGES } from '@/i18n';

const LANGUAGE_KEY = 'app_language';

interface LanguageStore {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  loadSavedLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: i18n.language as AppLanguage,

  setLanguage: async (lang: AppLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    set({ language: lang });
  },

  loadSavedLanguage: async () => {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved as AppLanguage)) {
      await i18n.changeLanguage(saved);
      set({ language: saved as AppLanguage });
    }
  },
}));
