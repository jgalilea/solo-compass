import { createContext } from "react";
import type { ThemeMode } from "../lib/mode";

export interface ModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** El modo ya resuelto ("auto" convertido a claro u oscuro real). */
  resolvedMode: "light" | "dark";
}

export const ModeContext = createContext<ModeContextValue | null>(null);
