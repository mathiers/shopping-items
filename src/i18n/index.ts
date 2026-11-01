
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANGUAGE_KEY = '@shopping_language';

const resources = {
  en: {
    translation: {
      settings: 'Settings',
      settingsSubtitle: 'Personalise your shopping experience',
      appearance: 'APPEARANCE',
      darkMode: 'Dark Mode',
      darkModeSubtitle: 'Dark appearance for the app',
      regionLanguage: 'REGION & LANGUAGE',
      appLanguage: 'App Language',
      currency: 'Currency',
      shoppingPreferences: 'SHOPPING PREFERENCES',
      categories: 'Categories',
      categoriesSubtitle: 'Manage categories, icons, colours and order',
      about: 'ABOUT',
      appDescription: 'Shopping list and budget manager',
      shop: 'Shop',
      history: 'History',
      budget: 'Budget',
    },
  },
  fr: {
    translation: {
      settings: 'Paramètres',
      settingsSubtitle: 'Personnalisez votre expérience d’achat',
      appearance: 'APPARENCE',
      darkMode: 'Mode sombre',
      darkModeSubtitle: 'Apparence sombre pour l’application',
      regionLanguage: 'RÉGION ET LANGUE',
      appLanguage: 'Langue de l’application',
      currency: 'Devise',
      shoppingPreferences: 'PRÉFÉRENCES D’ACHAT',
      categories: 'Catégories',
      categoriesSubtitle: 'Gérer les catégories, icônes, couleurs et ordre',
      about: 'À PROPOS',
      appDescription: 'Gestionnaire de listes de courses et de budget',
      shop: 'Courses',
      history: 'Historique',
      budget: 'Budget',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export async function loadSavedLanguage() {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved) await i18n.changeLanguage(saved);
  } catch (error) {
    console.error('Language loading error:', error);
  }
}

export async function changeAppLanguage(code: string) {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
}

export default i18n;
