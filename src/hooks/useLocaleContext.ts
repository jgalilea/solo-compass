import { useContext } from "react";
import { LocaleContext, type LocaleContextValue } from "./localeContextInstance";

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocaleContext must be used inside LocaleProvider");
  }
  return ctx;
}
