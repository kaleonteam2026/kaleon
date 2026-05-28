import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

/** English-only i18n (language picker removed; translations still power the UI). */
export const SUPPORTED_LOCALES = ["en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<
  SupportedLocale,
  { native: string; english: string; flag: string }
> = {
  en: { native: "English", english: "English", flag: "🇺🇸" },
};

export const RTL_LOCALES: ReadonlySet<SupportedLocale> = new Set();

export function isRtlLocale(_locale: string): boolean {
  return false;
}

export const LOCALE_STORAGE_KEY = "kaleon_locale";

export function getStoredLocale(): SupportedLocale {
  return "en";
}

export function setStoredLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
}

export async function loadLocale(_locale: SupportedLocale): Promise<void> {
  /* English bundle is bundled at init */
}

export async function changeLocale(locale: SupportedLocale): Promise<void> {
  await loadLocale(locale);
  setStoredLocale(locale);
  await i18n.changeLanguage(locale);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en"],
  interpolation: { escapeValue: false },
});

if (typeof window !== "undefined") {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
}

export default i18n;
