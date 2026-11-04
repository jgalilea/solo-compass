/**
 * Meaning tables.
 *
 * Built-in tables are original, generic content (written for Solo
 * Compass, without copying tables from any licensed game), meant to
 * work in any setting. Their texts (name, description and entries) are
 * bilingual and live in the dictionary; getMeaningTables combines them
 * with the structural data here. Entries are listed in order: the first
 * one matches the die's lowest value. Adding a built-in table is just
 * adding data here and its texts in the dictionary.
 *
 * The player's own tables (customTables.ts) are converted to the same
 * MeaningTable shape, so rolling, history and the journal don't tell
 * them apart.
 *
 * Dice: "d66" is two d6 read as tens and units (11–16, 21–26 … 61–66);
 * any other "dN" is a single die with N faces (d6, d20, d100, d7…).
 */

import type { Dictionary } from "./i18n";

export type DiceType = "d66" | `d${number}`;

export interface TableEntry {
  range: [number, number];
  text: string;
}

export interface GameRef {
  /** Name of the game/system/book the table belongs to (or generic). */
  name: string;
  /** Optional link to the source/manual. No link if it's a generic table. */
  url?: string;
  author?: string;
  license?: string;
}

export interface MeaningTable {
  id: string;
  name: string;
  description: string;
  dice: DiceType;
  game: GameRef;
  entries: TableEntry[];
  /** Made or imported by the player (editable, not translated). */
  custom?: boolean;
}

export type TableKey = keyof Dictionary["tables"]["entries"];

/** Faces of a single die ("d20" -> 20); 0 if it isn't a valid die. */
export function diceSides(dice: string): number {
  const m = /^d(\d+)$/.exec(dice);
  return m ? Number(m[1]) : 0;
}

/** Possible values of each die, in order (d66: 11–16, 21–26 … 61–66). */
export function diceValues(dice: DiceType): number[] {
  if (dice === "d66") {
    const values: number[] = [];
    for (let tens = 1; tens <= 6; tens++) {
      for (let ones = 1; ones <= 6; ones++) values.push(tens * 10 + ones);
    }
    return values;
  }
  return Array.from({ length: diceSides(dice) }, (_, i) => i + 1);
}

// Structural (language-independent) data for each table, in the order
// they're listed: meaning (action + theme), the classics, description,
// then generic prompts.
const TABLE_STRUCTURE: { id: string; dice: DiceType; key: TableKey }[] = [
  { id: "accion", dice: "d66", key: "accion" },
  { id: "tema", dice: "d66", key: "tema" },
  { id: "evento-aleatorio", dice: "d66", key: "eventoAleatorio" },
  { id: "accion-pnj", dice: "d20", key: "accionPnj" },
  { id: "descriptor-escena", dice: "d20", key: "descriptorEscena" },
  { id: "modo", dice: "d20", key: "modo" },
  { id: "aspecto", dice: "d20", key: "aspecto" },
  { id: "rasgo-pnj", dice: "d20", key: "rasgoPnj" },
  { id: "motivacion", dice: "d20", key: "motivacion" },
  { id: "complicacion", dice: "d20", key: "complicacion" },
  { id: "lugar", dice: "d20", key: "lugar" },
  { id: "hallazgo", dice: "d20", key: "hallazgo" },
  { id: "clima", dice: "d6", key: "clima" },
];

/** The two tables "Quick inspiration" rolls together (action + theme). */
export const INSPIRATION_TABLE_IDS = ["accion", "tema"] as const;

export function builtInTableId(key: TableKey): string {
  return TABLE_STRUCTURE.find((s) => s.key === key)!.id;
}

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
      game: { name: t.tables.genericGame },
      entries,
    };
  });
}

export function diceMax(dice: DiceType): number {
  return dice === "d66" ? 66 : diceSides(dice);
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
  const value = rollDie(diceSides(dice));
  return { rolls: [value], total: value };
}

export function lookupEntry(table: MeaningTable, total: number): TableEntry | undefined {
  return table.entries.find((e) => total >= e.range[0] && total <= e.range[1]);
}

/** "5" or "1–3": how a table entry's range is shown. */
export function formatRange([from, to]: [number, number]): string {
  return from === to ? String(from) : `${from}–${to}`;
}
