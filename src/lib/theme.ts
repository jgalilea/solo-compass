/**
 * The app's visual themes. Each theme redefines the colour and
 * typography tokens in src/index.css (`:root[data-theme="…"]` blocks);
 * components don't change, they just use the same Tailwind classes
 * (bg-gold, text-parchment, font-display…) that point to those tokens.
 */

export type ThemeId = "fantasia" | "pulp" | "moderno" | "scifi" | "osr";

export interface ThemeInfo {
  id: ThemeId;
  /** [background, accent, text] for the picker's colour swatch. */
  swatch: [string, string, string];
  /** Same, but for the same theme's light mode. */
  swatchLight: [string, string, string];
}

// Each theme's name and description live in the language dictionary
// (src/lib/i18n/locales/*.ts, key `theme`), not here. The colours
// must match the ones defined in src/index.css.
export const THEMES: ThemeInfo[] = [
  {
    id: "fantasia",
    swatch: ["#0b0c10", "#d7b26d", "#f4efe6"],
    swatchLight: ["#f7f1e4", "#74541c", "#2b2013"],
  },
  {
    id: "pulp",
    swatch: ["#15120f", "#dd9a35", "#ece1c8"],
    swatchLight: ["#f2e6cc", "#72451c", "#241a10"],
  },
  {
    id: "moderno",
    swatch: ["#0a0b0d", "#6c8cff", "#eef0f3"],
    swatchLight: ["#f7f8fa", "#2f4fe0", "#14171c"],
  },
  {
    id: "scifi",
    swatch: ["#04070a", "#39e75f", "#d7ecdf"],
    swatchLight: ["#eef8f4", "#0d6d46", "#0c1f17"],
  },
  {
    id: "osr",
    swatch: ["#000000", "#f24646", "#f2f0eb"],
    swatchLight: ["#f4f1ea", "#af1d19", "#0a0a0a"],
  },
];

const STORAGE_KEY = "solo-compass:theme";
export const DEFAULT_THEME: ThemeId = "fantasia";

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function loadTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isThemeId(saved)) return saved;
  } catch {
    // No localStorage available: silently use the default theme, it's
    // not a critical failure for the rest of the app.
  }
  return DEFAULT_THEME;
}

export function saveTheme(theme: ThemeId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Same as in loadTheme: if it fails, the theme doesn't persist between
    // sessions but the app keeps working normally.
  }
}
