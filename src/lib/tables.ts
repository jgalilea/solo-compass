/**
 * Meaning tables: the shape every screen rolls on, and the dice.
 *
 * The tables themselves come from two sources: the built-in ones, one
 * game at a time and loaded on demand (tableGames.ts, data in
 * tableData/), and the player's own (customTables.ts). Both are turned
 * into the same MeaningTable, so rolling, history and the journal don't
 * tell them apart.
 *
 * Dice: "d66" is two d6 read as tens and units (11–16, 21–26 … 61–66);
 * any other "dN" is a single die with N faces (d6, d20, d100, d7…).
 */

import { normalizeForSearch } from "./text";

export type DiceType = "d66" | `d${number}`;

/**
 * What a table is about, shared by every game so the Tables screen can
 * filter across all of them (and group each game's block). In display
 * order; their names live in the dictionary (`tables.themes`).
 */
export const TABLE_THEMES = [
  "inspiration",
  "plot",
  "characters",
  "names",
  "places",
  "settlements",
  "dungeons",
  "creatures",
  "factions",
  "danger",
  "items",
  "events",
  "space",
  "planets",
] as const;

export type TableTheme = (typeof TABLE_THEMES)[number];

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
  /**
   * Short name put before the table's in the history and the journal
   * ("Ironsworn: Action"), where tables of every game are mixed and two
   * of them can share a name. No tag for Solo Compass's own.
   */
  tag?: string;
}

export interface MeaningTable {
  id: string;
  name: string;
  description: string;
  dice: DiceType;
  game: GameRef;
  entries: TableEntry[];
  /** Built-in tables only; the player's own have none. */
  theme?: TableTheme;
  /** Made or imported by the player (editable, not translated). */
  custom?: boolean;
}

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

/** How a roll on this table is named in the history and the journal. */
export function tableRollName(table: MeaningTable): string {
  return table.game.tag ? `${table.game.tag}: ${table.name}` : table.name;
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

// --- Results that send you to roll again -------------------------------

/** "Roll twice" and the like: roll that many more times on the same table. */
const ROLL_AGAIN: [RegExp, number][] = [
  [/^(roll twice|tira dos veces)\.?$/i, 2],
  [/^(roll three times|tira tres veces)\.?$/i, 3],
  [/^(roll twice more on this table|tira dos veces más en esta tabla)\b/i, 2],
];
/** "{Table name}" inside a result: a roll on that table goes there. */
const TABLE_REFERENCE = /\{([^{}\n]{1,80})\}/g;
const MAX_DEPTH = 3;

function rollAgainCount(text: string): number {
  return ROLL_AGAIN.find(([re]) => re.test(text.trim()))?.[1] ?? 0;
}

/**
 * The text of a table result, following what it asks for (kept light:
 * no rules engine, just the two common cases):
 *
 * - "Roll twice" / "Tira dos veces" (and three times, and Ironsworn's
 *   "Roll twice more on this table…"): rolls that many more times on
 *   the same table and adds them, "Roll twice → Ruins · Cave". An
 *   extra that's another "roll twice" is rolled again.
 * - "{Name}": a roll on the table called that (by name, "Game: name" or
 *   id, accents and case ignored) among `tables`, the ones loaded right
 *   now; mostly for the player's own tables. Left as written if there's
 *   no such table.
 *
 * "→", not "->": the journal splits a roll's text at its last "->".
 */
export function resolveResult(
  table: MeaningTable,
  total: number,
  tables: MeaningTable[] = [],
  fallback = "",
  depth = 0,
): string {
  const text = lookupEntry(table, total)?.text ?? fallback;
  if (depth >= MAX_DEPTH) return text;
  let result = text.replace(TABLE_REFERENCE, (whole, name: string) => {
    const wanted = normalize(name);
    const target = tables.find(
      (x) => normalize(x.name) === wanted || normalize(tableRollName(x)) === wanted || x.id === name.trim(),
    );
    return target ? resolveResult(target, rollForTable(target.dice).total, tables, fallback, depth + 1) : whole;
  });
  const again = rollAgainCount(text);
  if (again > 0) {
    const extras: string[] = [];
    for (let tries = 0; extras.length < again && tries < 20; tries++) {
      const roll = rollForTable(table.dice).total;
      if (rollAgainCount(lookupEntry(table, roll)?.text ?? "") > 0) continue;
      extras.push(resolveResult(table, roll, tables, fallback, depth + 1));
    }
    result = `${result} → ${extras.join(" · ")}`;
  }
  return result;
}

function normalize(s: string): string {
  return normalizeForSearch(s).replace(/\s+/g, " ").trim();
}
