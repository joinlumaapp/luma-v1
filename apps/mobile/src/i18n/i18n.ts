import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { storage } from '../utils/storage';

import tr from './tr.json';
import en from './en.json';

const LANGUAGE_STORAGE_KEY = 'luma_language';

// Detect device locale — default to Turkish
const getDeviceLanguage = (): string => {
  try {
    const locales = getLocales();
    const deviceLang = locales?.[0]?.languageCode ?? 'tr';
    return deviceLang === 'en' ? 'en' : 'tr';
  } catch {
    return 'tr';
  }
};

// Load saved language from storage, fallback to device locale
const getSavedLanguage = (): string => {
  try {
    const saved = storage.getString(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'tr') return saved;
  } catch {
    // ignore
  }
  return getDeviceLanguage();
};

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: getDeviceLanguage(), // Sync default — async override below
  fallbackLng: 'tr',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Override with saved preference if different
const savedLang = getSavedLanguage();
if (savedLang !== i18n.language) {
  i18n.changeLanguage(savedLang);
}

/**
 * Change language and persist the choice.
 */
export const changeLanguage = (lang: 'tr' | 'en'): void => {
  i18n.changeLanguage(lang);
  try {
    storage.setString(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
};

export default i18n;
