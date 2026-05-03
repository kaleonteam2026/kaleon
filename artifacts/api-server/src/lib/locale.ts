import type { Request } from "express";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Simplified Chinese (简体中文)",
  vi: "Vietnamese (Tiếng Việt)",
  tl: "Tagalog",
  ko: "Korean (한국어)",
};

const SUPPORTED = new Set(Object.keys(LANG_NAMES));

/** Read the user's preferred locale from request, defaulting to "en". */
export function getRequestLocale(req: Request): string {
  const header = req.header("x-dyp-locale");
  if (header && SUPPORTED.has(header)) return header;
  // Fall back to Accept-Language primary tag
  const accept = req.header("accept-language");
  if (accept) {
    const tag = accept.split(",")[0]?.trim().toLowerCase().split("-")[0] ?? "";
    if (SUPPORTED.has(tag)) return tag;
  }
  return "en";
}

/** Human-readable language name for prompt instruction. */
export function languageName(locale: string): string {
  return LANG_NAMES[locale] ?? "English";
}

/** Suffix to append to AI system prompts so the model responds in user's language. */
export function localePromptSuffix(locale: string): string {
  if (locale === "en") return "";
  return `\n\nIMPORTANT: Respond entirely in ${languageName(locale)}. Translate all proper names of California programs (UC, CSU, IGETC, TAG, EOPS, FAFSA, Cal Grant, Dream Act) only when a natural translation exists; otherwise keep the English acronym followed by a short translation in parentheses on first use. Keep all URLs, course codes, and university names in their original form.`;
}

/** Suffix specifically for JSON-only outputs — only adds language note for free-text fields. */
export function localeJsonPromptSuffix(locale: string): string {
  if (locale === "en") return "";
  return `\n\nFor any free-text/explanation fields in the JSON, write the values in ${languageName(locale)}. Keep JSON keys, course codes, and IDs in English.`;
}
