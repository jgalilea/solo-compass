import { es } from "./locales/es";
import { en } from "./locales/en";
import { LOCALES, type Dictionary, type Locale } from "./types";

export type { Dictionary, Locale } from "./types";
export { LOCALES, interpolate } from "./types";

export const DICTIONARIES: Record<Locale, Dictionary> = { es, en };

const STORAGE_KEY = "solo-compass:locale";
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

/**
 * Spanish if the browser is in Spanish (any variant: es, es-MX,
 * es-419…); English for everything else, as requested.
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const lang of candidates) {
    if (lang?.toLowerCase().startsWith("es")) return "es";
  }
  return DEFAULT_LOCALE;
}

export function loadLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isLocale(saved)) return saved;
  } catch {
    // No localStorage available: silently use the browser's
    // detection, it's not a critical failure.
  }
  return detectBrowserLocale();
}

export function saveLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Same as in loadLocale: if it fails, the language doesn't persist
    // between sessions but the app keeps working normally.
  }
}
