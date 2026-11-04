/**
 * Light/dark mode, independent of the theme (colour and visual
 * identity) — they combine: each of the 5 themes defines both its dark
 * and its light palette in src/index.css
 * (:root[data-theme="…"][data-mode="light"]).
 */

export type ThemeMode = "light" | "dark" | "auto";

export const MODES: ThemeMode[] = ["light", "dark", "auto"];

const STORAGE_KEY = "solo-compass:mode";
// "dark" and not "auto": every theme was designed for dark from the
// start, so anyone who doesn't touch the new picker keeps seeing
// exactly the same as before.
export const DEFAULT_MODE: ThemeMode = "dark";

export function isThemeMode(value: string): value is ThemeMode {
  return (MODES as string[]).includes(value);
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function loadMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isThemeMode(saved)) return saved;
  } catch {
    // No localStorage available: silently use the default mode, it's
    // not a critical failure for the rest of the app.
  }
  return DEFAULT_MODE;
}

export function saveMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Same as in loadMode: if it fails, the mode doesn't persist between
    // sessions but the app keeps working normally.
  }
}
