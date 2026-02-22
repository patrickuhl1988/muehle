/**
 * i18n setup: i18next + react-i18next, persistence via AsyncStorage, device language detection.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import de from './locales/de';
import en from './locales/en';

const LANGUAGE_KEY = 'app-language';

export type AppLanguage = 'de' | 'en';

async function getStoredLanguage(): Promise<AppLanguage | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
    return null;
  } catch {
    return null;
  }
}

function getDeviceLanguage(): AppLanguage {
  const locale = Localization.getLocales()[0]?.languageCode ?? '';
  return locale === 'en' ? 'en' : 'de';
}

/**
 * Initializes i18n: loads stored or device language, then init react-i18next.
 * Call once before rendering the app (e.g. in root layout).
 */
export async function initI18n(): Promise<void> {
  const stored = await getStoredLanguage();
  const language = stored ?? getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: { de: { translation: de }, en: { translation: en } },
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

/**
 * Changes the app language and persists to AsyncStorage.
 */
export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
}

export default i18n;
