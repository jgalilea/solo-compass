import { es } from "./locales/es";
import { en } from "./locales/en";
import { esLong } from "./locales/es.long";
import { enLong } from "./locales/en.long";
import type { Dictionary, Locale, LongTexts } from "./types";

/**
 * Both dictionaries at once, for tests. The app never imports this: it
 * loads only the language in use (loadDictionary in ./index.ts).
 */
export const DICTIONARIES: Record<Locale, Dictionary> = { es, en };

/** Both languages' long texts (help, guide, sample), for tests. */
export const LONG_TEXTS: Record<Locale, LongTexts> = { es: esLong, en: enLong };
