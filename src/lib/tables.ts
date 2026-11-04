/**
 * Meaning tables.
 *
 * Original, generic content (written for Solo Compass, without copying
 * tables from any licensed game), meant to work in any setting. The
 * structure supports d6, d66 (two d6 read as tens/units) and d20:
 * adding a table is just adding data here and its texts in the
 * dictionary.
 * The texts (name, description and entries) are bilingual and live in
 * the dictionary; getMeaningTables combines them with the structural
 * data here. Entries are listed in order: the first one matches the
 * die's lowest value.
 */

import type { Dictionary } from "./i18n";

export type DiceType = "d6" | "d66" | "d20";

export interface TableEntry {
  range: [number, number];
  text: string;
}

export interface GameRef {
  /** Name of the game/system the table belongs to (or generic). */
  name: string;
  /** Optional link to the source/manual. No link if it's a generic table. */
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

/** Possible values of each die, in order (d66: 11–16, 21–26 … 61–66). */
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

// Structural (language-independent) data for each table.
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

/** Returns the individual dice rolled and the combined value used to look up the table. */
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
