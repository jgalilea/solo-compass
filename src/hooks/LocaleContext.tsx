import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DICTIONARIES, loadLocale, saveLocale, type Locale } from "../lib/i18n";
import { LocaleContext } from "./localeContextInstance";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => loadLocale());

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    // Installing reads the manifest linked at that moment: the one in
    // this language (both built in vite.config.ts). No link in dev.
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest) {
      manifest.href = `${import.meta.env.BASE_URL}${locale === "es" ? "manifest.webmanifest" : "manifest.en.webmanifest"}`;
    }
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
