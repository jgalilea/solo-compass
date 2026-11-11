import { es } from "./locales/es";
import { en } from "./locales/en";
import type { Dictionary, Locale } from "./types";

/**
 * Both dictionaries at once, for tests. The app never imports this: it
 * loads only the language in use (loadDictionary in ./index.ts).
 */
export const DICTIONARIES: Record<Locale, Dictionary> = { es, en };
