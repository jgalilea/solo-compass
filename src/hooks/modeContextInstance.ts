import { createContext } from "react";
import type { ThemeMode } from "../lib/mode";

export interface ModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** The resolved mode ("auto" turned into actual light or dark). */
  resolvedMode: "light" | "dark";
}

export const ModeContext = createContext<ModeContextValue | null>(null);
