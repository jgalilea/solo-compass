/**
 * Temas visuales de la app. Cada tema redefine los tokens de color y
 * tipografía en src/index.css (bloques `:root[data-theme="…"]`); los
 * componentes no cambian, solo usan las mismas clases de Tailwind
 * (bg-gold, text-parchment, font-display…) que apuntan a esos tokens.
 */

export type ThemeId = "fantasia" | "pulp" | "moderno" | "scifi" | "osr";

export interface ThemeInfo {
  id: ThemeId;
  /** [fondo, acento, texto] para la muestra de color del selector. */
  swatch: [string, string, string];
  /** Igual, pero para el modo claro del mismo tema. */
  swatchLight: [string, string, string];
}

// El nombre y la descripción de cada tema viven en el diccionario de
// idioma (src/lib/i18n/locales/*.ts, clave `theme`), no aquí. Los
// colores tienen que coincidir con los definidos en src/index.css.
export const THEMES: ThemeInfo[] = [
  {
    id: "fantasia",
    swatch: ["#0b0c10", "#d7b26d", "#f4efe6"],
    swatchLight: ["#f7f1e4", "#9c6f1f", "#2b2013"],
  },
  {
    id: "pulp",
    swatch: ["#15120f", "#dd9a35", "#ece1c8"],
    swatchLight: ["#f2e6cc", "#a8621f", "#241a10"],
  },
  {
    id: "moderno",
    swatch: ["#0a0b0d", "#6c8cff", "#eef0f3"],
    swatchLight: ["#f7f8fa", "#3757e0", "#14171c"],
  },
  {
    id: "scifi",
    swatch: ["#04070a", "#39e75f", "#d7ecdf"],
    swatchLight: ["#eef8f4", "#0e8a56", "#0c1f17"],
  },
  {
    id: "osr",
    swatch: ["#000000", "#c81e1e", "#f2f0eb"],
    swatchLight: ["#f4f1ea", "#b81f1a", "#0a0a0a"],
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
    // Sin localStorage disponible: se usa el tema por defecto en
    // silencio, no es un fallo crítico para el resto de la app.
  }
  return DEFAULT_THEME;
}

export function saveTheme(theme: ThemeId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Igual que en loadTheme: si falla, el tema no persiste entre
    // sesiones pero la app sigue funcionando con normalidad.
  }
}
