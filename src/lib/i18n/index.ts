import { LOCALES, type Dictionary, type Locale } from "./types";

export type { Dictionary, Locale } from "./types";
export { LOCALES, interpolate } from "./types";

/**
 * Each language is its own chunk: only the one in use is downloaded
 * (together they were a sixth of the main bundle). index.html preloads
 * it alongside the main bundle (localeModulePreload in vite.config.ts),
 * and main.tsx waits for it before the first render, so the context
 * always has a dictionary at hand.
 */
const LOADERS: Record<Locale, () => Promise<Dictionary>> = {
  es: () => import("./locales/es").then((m) => m.es),
  en: () => import("./locales/en").then((m) => m.en),
};

const loaded: Partial<Record<Locale, Dictionary>> = {};

export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  return (loaded[locale] ??= await LOADERS[locale]());
}

/** A dictionary already loaded by loadDictionary, if any. */
export function loadedDictionary(locale: Locale): Dictionary | undefined {
  return loaded[locale];
}

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
