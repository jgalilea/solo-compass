import { createContext } from "react";
import type { ThemeId } from "../lib/theme";

export interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
