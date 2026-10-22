import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { loadMode, saveMode, systemPrefersDark, type ThemeMode } from "../lib/mode";
import { ModeContext } from "./modeContextInstance";

// Preferencia claro/oscuro del sistema operativo, escuchada en vivo:
// si cambia mientras la app está abierta (p. ej. al anochecer), el
// modo "auto" lo sigue.
function subscribeToSystemScheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => loadMode());
  const systemDark = useSyncExternalStore(subscribeToSystemScheme, systemPrefersDark);
  // Derivado, no estado propio: así no hay que sincronizarlo con un efecto.
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
