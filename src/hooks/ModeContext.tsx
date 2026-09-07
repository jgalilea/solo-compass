import { useEffect, useState, type ReactNode } from "react";
import { loadMode, resolveMode, saveMode, type ThemeMode } from "../lib/mode";
import { ModeContext } from "./modeContextInstance";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => loadMode());
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(() =>
    resolveMode(mode),
  );

  useEffect(() => {
    saveMode(mode);
  }, [mode]);

  // Si el modo es "auto", además de recalcular al cambiar `mode`, hay
  // que escuchar cuando el propio sistema operativo cambia de claro a
  // oscuro (o viceversa) mientras la app sigue abierta.
  useEffect(() => {
    setResolvedMode(resolveMode(mode));
    if (mode !== "auto" || typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange(e: MediaQueryListEvent) {
      setResolvedMode(e.matches ? "dark" : "light");
    }
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
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
