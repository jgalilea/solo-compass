/**
 * Modo claro/oscuro, independiente del tema (color e identidad
 * visual) — se combinan: cada uno de los 5 temas define tanto su
 * paleta oscura como su paleta clara en src/index.css
 * (:root[data-theme="…"][data-mode="light"]).
 */

export type ThemeMode = "light" | "dark" | "auto";

export const MODES: ThemeMode[] = ["light", "dark", "auto"];

const STORAGE_KEY = "solo-compass:mode";
// "dark" y no "auto": todos los temas se diseñaron para oscuro desde
// el principio, así que quien no toque el selector nuevo sigue
// viendo exactamente lo mismo que antes.
export const DEFAULT_MODE: ThemeMode = "dark";

export function isThemeMode(value: string): value is ThemeMode {
  return (MODES as string[]).includes(value);
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** "auto" se resuelve contra la preferencia del sistema en cada momento. */
export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

export function loadMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isThemeMode(saved)) return saved;
  } catch {
    // Sin localStorage disponible: se usa el modo por defecto en
    // silencio, no es un fallo crítico para el resto de la app.
  }
  return DEFAULT_MODE;
}

export function saveMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Igual que en loadMode: si falla, el modo no persiste entre
    // sesiones pero la app sigue funcionando con normalidad.
  }
}
