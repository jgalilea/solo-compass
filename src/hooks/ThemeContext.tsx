import { useEffect, useState, type ReactNode } from "react";
import { loadTheme, saveTheme, type ThemeId } from "../lib/theme";
import { ThemeContext } from "./themeContextInstance";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(() => loadTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
