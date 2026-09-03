import { createContext } from "react";
import type { Dictionary, Locale } from "../lib/i18n";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);
