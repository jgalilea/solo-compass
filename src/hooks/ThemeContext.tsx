import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadTheme, saveTheme, type ThemeId } from "../lib/theme";
import { ThemeContext } from "./themeContextInstance";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(() => loadTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
