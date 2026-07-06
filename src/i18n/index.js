import { ref, inject } from "vue";
import { messages } from "./messages.js";

const I18N_KEY = Symbol("i18n");
const STORAGE_KEY = "webtv-locale";

function detectLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && messages[stored]) return stored;

  // Default to English, but support French if browser language is French
  const browserLangs = navigator.languages || [navigator.language];
  for (const lang of browserLangs) {
    if (lang.startsWith("fr")) return "fr";
  }
  return "en";
}

export function createI18n() {
  const locale = ref(detectLocale());

  function t(key, params) {
    const keys = key.split('.');
    let str = keys.reduce((acc, k) => acc?.[k], messages[locale.value]) || 
              keys.reduce((acc, k) => acc?.[k], messages.en) || 
              key;
              
    if (typeof str !== 'string') str = key;
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  }

  function setLocale(lang) {
    if (messages[lang]) {
      locale.value = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.setAttribute("lang", lang);
    }
  }

  // Set initial lang attribute
  document.documentElement.setAttribute("lang", locale.value);

  return {
    locale,
    t,
    setLocale,
    install(app) {
      app.provide(I18N_KEY, { locale, t, setLocale });
    },
  };
}

export function useI18n() {
  const i18n = inject(I18N_KEY);
  if (!i18n) throw new Error("i18n not provided. Call createI18n() in main.js.");
  return i18n;
}
