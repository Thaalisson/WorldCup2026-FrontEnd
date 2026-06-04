import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt from './locales/pt.json';
import en from './locales/en.json';

const LANG_KEY = 'bolao_lang';
const saved = localStorage.getItem(LANG_KEY);
const browser = navigator.language.startsWith('en') ? 'en' : 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    lng: saved ?? browser,
    fallbackLng: 'pt',
    interpolation: { escapeValue: false },
  });

export function setLanguage(lang: 'pt' | 'en') {
  localStorage.setItem(LANG_KEY, lang);
  i18n.changeLanguage(lang);
}

export function getLanguage(): 'pt' | 'en' {
  return (i18n.language?.startsWith('en') ? 'en' : 'pt') as 'pt' | 'en';
}

export default i18n;
