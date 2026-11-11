import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadDictionary, loadedDictionary, loadLocale, saveLocale, type Dictionary, type Locale } from "../lib/i18n";
import { LocaleContext } from "./localeContextInstance";

export function LocaleProvider({ children }: { children: ReactNode }) {
  // main.tsx loads the starting language before rendering.
  const [{ locale, t }, setCurrent] = useState<{ locale: Locale; t: Dictionary }>(() => {
    const initial = loadLocale();
    const dictionary = loadedDictionary(initial);
    if (!dictionary) throw new Error(`Dictionary "${initial}" not loaded before rendering`);
    return { locale: initial, t: dictionary };
  });

  // The other language arrives in a moment (cached by the service
  // worker): until then the app stays in the current one.
  const setLocale = useCallback((next: Locale) => {
    void loadDictionary(next).then((dictionary) => setCurrent({ locale: next, t: dictionary }));
  }, []);

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

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
