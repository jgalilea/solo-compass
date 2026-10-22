/**
 * Tablas de significado.
 *
 * Contenido original y genérico (escrito para Solo Compass, sin
 * copiar tablas de ningún juego con licencia), pensado para servir en
 * cualquier ambientación. La estructura soporta d6, d66 (dos d6
 * leídos como decenas/unidades) y d20: añadir una tabla es solo
 * añadir datos aquí y sus textos en el diccionario.
 * Los textos (nombre, descripción y entradas) son bilingües y viven
 * en el diccionario; getMeaningTables los combina con los datos
 * estructurales de aquí. Las entradas se listan en orden: la primera
 * corresponde al valor más bajo del dado.
 */

import type { Dictionary } from "./i18n";

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

type TableKey = keyof Dictionary["tables"]["entries"];

/** Valores posibles de cada dado, en orden (d66: 11–16, 21–26 … 61–66). */
function diceValues(dice: DiceType): number[] {
  if (dice === "d66") {
    const values: number[] = [];
    for (let tens = 1; tens <= 6; tens++) {
      for (let ones = 1; ones <= 6; ones++) values.push(tens * 10 + ones);
    }
    return values;
  }
  return Array.from({ length: diceMax(dice) }, (_, i) => i + 1);
}

// Datos estructurales (independientes del idioma) de cada tabla.
const TABLE_STRUCTURE: {
  id: string;
  dice: DiceType;
  gameName: (t: Dictionary) => string;
  gameUrl?: string;
  key: TableKey;
}[] = [
  {
    id: "evento-aleatorio",
    dice: "d66",
    gameName: (t) => t.tables.genericGame,
    key: "eventoAleatorio",
  },
  {
    id: "accion-pnj",
    dice: "d20",
    gameName: (t) => t.tables.genericGame,
    key: "accionPnj",
  },
  {
    id: "descriptor-escena",
    dice: "d20",
    gameName: (t) => t.tables.genericGame,
    key: "descriptorEscena",
  },
];

export function getMeaningTables(t: Dictionary): MeaningTable[] {
  return TABLE_STRUCTURE.map((s) => {
    const texts = t.tables.entries[s.key];
    const entries = diceValues(s.dice).map((value, i) => ({
      range: [value, value] as [number, number],
      text: texts[i] ?? t.tables.noEntryFallback,
    }));
    return {
      id: s.id,
      name: t.tables.names[s.key],
      description: t.tables.descriptions[s.key],
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
