import type { TableTheme } from "../tables";
import type { Locale } from "./types";

/**
 * The table themes' names in every language. Part of each dictionary
 * (`tables.themes`), but kept apart so that reading a custom table's
 * theme by name in either language (customTables.ts) doesn't need both
 * dictionaries in the main bundle.
 */
export const TABLE_THEME_NAMES: Record<Locale, Record<TableTheme, string>> = {
  es: {
    inspiration: "Inspiración",
    plot: "Trama y aventura",
    characters: "Personajes",
    names: "Nombres",
    places: "Lugares",
    settlements: "Asentamientos",
    dungeons: "Mazmorras y ruinas",
    creatures: "Criaturas",
    factions: "Facciones",
    danger: "Peligros y combate",
    items: "Objetos y tesoros",
    events: "Sucesos y clima",
    space: "Espacio y naves",
    planets: "Planetas",
  },
  en: {
    inspiration: "Inspiration",
    plot: "Plot and adventure",
    characters: "Characters",
    names: "Names",
    places: "Places",
    settlements: "Settlements",
    dungeons: "Dungeons and ruins",
    creatures: "Creatures",
    factions: "Factions",
    danger: "Danger and combat",
    items: "Items and treasure",
    events: "Events and weather",
    space: "Space and starships",
    planets: "Planets",
  },
};
