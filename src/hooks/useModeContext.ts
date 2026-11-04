import { useContext } from "react";
import { ModeContext, type ModeContextValue } from "./modeContextInstance";

export function useModeContext(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useModeContext must be used inside ModeProvider");
  }
  return ctx;
}
