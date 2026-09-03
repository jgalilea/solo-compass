/**
 * Tablas de significado.
 *
 * El contenido es un marcador de posición: la estructura ya soporta
 * dados d6, d66 (dos d6 leídos como decenas/unidades) y d20, para que
 * más adelante solo haga falta sustituir el texto de cada entrada.
 * El nombre, la descripción y el nombre del juego son bilingües y
 * viven en el diccionario de idioma (getMeaningTables los combina con
 * los datos estructurales de aquí).
 */

import { interpolate, type Dictionary } from "./i18n";

export type DiceType = "d6" | "d66" | "d20";

export interface TableEntry {
  range: [number, number];
  text: string;
}

export interface GameRef {
  /** Nombre del juego/sistema al que pertenece la tabla (o genérico). */
  name: string;
  /** Enlace opcional a la fuente/manual. Sin enlace si es una tabla genérica. */
  url?: string;
}

export interface MeaningTable {
  id: string;
  name: string;
  description: string;
  dice: DiceType;
  game: GameRef;
  entries: TableEntry[];
}

function placeholderEntries(
  t: Dictionary,
  name: string,
  count: number,
): TableEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    range: [i + 1, i + 1] as [number, number],
    text: interpolate(t.tables.placeholderEntry, { name, n: i + 1 }),
  }));
}

function placeholderD66(t: Dictionary, name: string): TableEntry[] {
  const entries: TableEntry[] = [];
  for (let tens = 1; tens <= 6; tens++) {
    for (let ones = 1; ones <= 6; ones++) {
      const value = tens * 10 + ones;
      entries.push({
        range: [value, value],
        text: interpolate(t.tables.placeholderEntry, { name, n: value }),
      });
    }
  }
  return entries;
}

// Datos estructurales (locale-independientes) de las tablas de
// ejemplo. El indicativo de juego + enlace son de muestra, para
// mostrar cómo se ve la función con y sin enlace — se sustituirán
// por los datos reales más adelante.
const TABLE_STRUCTURE: {
  id: string;
  dice: DiceType;
  gameName: (t: Dictionary) => string;
  gameUrl?: string;
  nameKey: keyof Dictionary["tables"]["names"];
  descriptionKey: keyof Dictionary["tables"]["descriptions"];
}[] = [
  {
    id: "evento-aleatorio",
    dice: "d66",
    gameName: () => "Ironsworn",
    gameUrl: "https://ironswornrpg.com",
    nameKey: "eventoAleatorio",
    descriptionKey: "eventoAleatorio",
  },
  {
    id: "accion-pnj",
    dice: "d20",
    gameName: () => "Mörk Borg",
    gameUrl: "https://morkborg.com",
    nameKey: "accionPnj",
    descriptionKey: "accionPnj",
  },
  {
    id: "descriptor-escena",
    dice: "d6",
    gameName: (t) => t.tables.genericGame,
    nameKey: "descriptorEscena",
    descriptionKey: "descriptorEscena",
  },
];

export function getMeaningTables(t: Dictionary): MeaningTable[] {
  return TABLE_STRUCTURE.map((s) => {
    const name = t.tables.names[s.nameKey];
    const entries =
      s.dice === "d66"
        ? placeholderD66(t, name)
        : placeholderEntries(t, name, diceMax(s.dice));
    return {
      id: s.id,
      name,
      description: t.tables.descriptions[s.descriptionKey],
      dice: s.dice,
      game: { name: s.gameName(t), url: s.gameUrl },
      entries,
    };
  });
}

export function diceMax(dice: DiceType): number {
  switch (dice) {
    case "d6":
      return 6;
    case "d66":
      return 66;
    case "d20":
      return 20;
  }
}

function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

/** Devuelve los dados individuales lanzados y el valor combinado usado para buscar en la tabla. */
export function rollForTable(dice: DiceType): { rolls: number[]; total: number } {
  if (dice === "d66") {
    const tens = rollDie(6);
    const ones = rollDie(6);
    return { rolls: [tens, ones], total: tens * 10 + ones };
  }
  const sides = dice === "d6" ? 6 : 20;
  const value = rollDie(sides);
  return { rolls: [value], total: value };
}

export function lookupEntry(table: MeaningTable, total: number): TableEntry | undefined {
  return table.entries.find((e) => total >= e.range[0] && total <= e.range[1]);
}
