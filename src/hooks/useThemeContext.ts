import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "./themeContextInstance";

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext debe usarse dentro de ThemeProvider");
  }
  return ctx;
}
