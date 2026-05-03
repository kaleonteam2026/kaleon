import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import zh from "./locales/zh.json";
import vi from "./locales/vi.json";
import tl from "./locales/tl.json";
import ko from "./locales/ko.json";

export const SUPPORTED_LOCALES = ["en", "es", "zh", "vi", "tl", "ko"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, { native: string; english: string; flag: string }> = {
  en: { native: "English", english: "English", flag: "🇺🇸" },
  es: { native: "Español", english: "Spanish", flag: "🇲🇽" },
  zh: { native: "简体中文", english: "Chinese (Simplified)", flag: "🇨🇳" },
  vi: { native: "Tiếng Việt", english: "Vietnamese", flag: "🇻🇳" },
  tl: { native: "Tagalog", english: "Tagalog", flag: "🇵🇭" },
  ko: { native: "한국어", english: "Korean", flag: "🇰🇷" },
};

export const LOCALE_STORAGE_KEY = "dyp_locale";

export function getStoredLocale(): SupportedLocale {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (v && (SUPPORTED_LOCALES as readonly string[]).includes(v)) {
    return v as SupportedLocale;
  }
  const browser = (navigator.language || "en").toLowerCase();
  if (browser.startsWith("es")) return "es";
  if (browser.startsWith("zh")) return "zh";
  if (browser.startsWith("vi")) return "vi";
  if (browser.startsWith("tl") || browser.startsWith("fil")) return "tl";
  if (browser.startsWith("ko")) return "ko";
  return "en";
}

export function setStoredLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      zh: { translation: zh },
      vi: { translation: vi },
      tl: { translation: tl },
      ko: { translation: ko },
    },
    lng: getStoredLocale(),
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    returnNull: false,
  });

if (typeof window !== "undefined") {
  document.documentElement.lang = i18n.language === "zh" ? "zh-CN" : i18n.language;
}

export default i18n;
