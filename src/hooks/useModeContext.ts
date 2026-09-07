import { useContext } from "react";
import { ModeContext, type ModeContextValue } from "./modeContextInstance";

export function useModeContext(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useModeContext debe usarse dentro de ModeProvider");
  }
  return ctx;
}
