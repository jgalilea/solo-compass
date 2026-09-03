import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DICTIONARIES, loadLocale, saveLocale, type Locale } from "../lib/i18n";
import { LocaleContext } from "./localeContextInstance";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => loadLocale());

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    saveLocale(locale);
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t: DICTIONARIES[locale] }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
