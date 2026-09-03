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
 * Español si el navegador está en español (cualquier variante: es,
 * es-MX, es-419…); inglés para todo lo demás, tal y como se pidió.
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
    // Sin localStorage disponible: se usa la detección del
    // navegador en silencio, no es un fallo crítico.
  }
  return detectBrowserLocale();
}

export function saveLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Igual que en loadLocale: si falla, el idioma no persiste entre
    // sesiones pero la app sigue funcionando con normalidad.
  }
}
