import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { loadMode, saveMode, systemPrefersDark, type ThemeMode } from "../lib/mode";
import { ModeContext } from "./modeContextInstance";

// The OS light/dark preference, listened to live: if it changes
// while the app is open (e.g. at dusk), "auto" mode follows it.
function subscribeToSystemScheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => loadMode());
  const systemDark = useSyncExternalStore(subscribeToSystemScheme, systemPrefersDark);
  // Derived, not its own state: so it doesn't need syncing with an effect.
  const resolvedMode: "light" | "dark" =
    mode === "auto" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    saveMode(mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.dataset.mode = resolvedMode;
    document.documentElement.style.colorScheme = resolvedMode;
  }, [resolvedMode]);

  return (
    <ModeContext.Provider value={{ mode, setMode, resolvedMode }}>
      {children}
    </ModeContext.Provider>
  );
}
