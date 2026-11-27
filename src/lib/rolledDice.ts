/**
 * The dice of a roll as they're drawn (RolledDice): each with its faces,
 * what came up and how it counted. Never stored: they're read back from
 * the roll's text, as Lonelog writes it (readRolledDice in
 * diceNotation.ts; readOracleDice here), so old, imported and sample
 * rolls are drawn like new ones.
 */

import type { OracleDiceGroup } from "./oracleEngines";

export interface RolledDie {
  /** 0 for a Fudge die. */
  sides: number;
  value: number;
  /** Left out (dropped, rerolled), a success or a failure, a critical. */
  mark?: "out" | "hit" | "miss" | "high" | "low";
}

/** Past this many, the dice read worse than the text, and aren't drawn. */
export const MAX_DRAWN_DICE = 12;

/** Whether these dice are worth drawing: not too many, and each number fits its die. */
export function canDrawDice(dice: readonly RolledDie[], max = MAX_DRAWN_DICE): boolean {
  return dice.length > 0 && dice.length <= max && dice.every((d) => Math.abs(d.value) < 1000);
}

// What a journal in either language calls each oracle's dice (`oracleDice`
// in the dictionaries, which can't be imported here; a test keeps them in step).
const ORACLE_DICE: Record<string, OracleDiceGroup["role"]> = {
  blanco: "white",
  white: "white",
  negro: "black",
  black: "black",
  oportunidad: "chance",
  chance: "chance",
  riesgo: "risk",
  risk: "risk",
  d100: "percentile",
  respuesta: "answer",
  answer: "answer",
  matiz: "modifier",
  modifier: "modifier",
};

export interface OracleDieRead {
  role: OracleDiceGroup["role"];
  sides: number;
  value: number;
  /** One of several of its colour that didn't count. */
  out?: boolean;
}

/**
 * The dice of an oracle's roll in the journal ("Recluse: blanco 3 / negro
 * 5", with a "—" before 1.5.1); null if it isn't one. A colour rolled
 * several times (a likelihood's dice) lists them all after the one that
 * counted, "blanco 5 (2, 5)"; before 1.6.3 only that one was written.
 */
export function readOracleDice(detail: string): OracleDieRead[] | null {
  const after = detail.match(/^\S.*?(?:\s—|:)\s+(.+)$/)?.[1];
  if (!after) return null;
  const dice: OracleDieRead[] = [];
  for (const part of after.split(" / ")) {
    const m = part.match(/^(\S+) (\d+)(?: vs \d+\+)?(?: \((\d+(?:, \d+)+)\))?$/);
    const role = m && ORACLE_DICE[m[1]!.toLowerCase()];
    if (!role) return null;
    const sides = role === "percentile" ? 100 : 6;
    const kept = Number(m[2]);
    const all = m[3]?.split(", ").map(Number);
    if (!all) dice.push({ role, sides, value: kept });
    // The one that counted is among them, or it isn't this.
    else if (!all.includes(kept)) return null;
    else
      for (const value of all)
        dice.push({ role, sides, value, ...(value !== kept ? { out: true } : {}) });
  }
  return dice;
}

/** An oracle's roll as it was written before 1.5.1 ("Recluse — blanco 3 …"), with its colon; any other as it is. */
export function fixOldOracle(text: string): string {
  const arrow = text.indexOf(" -> ");
  if (arrow < 0) return text;
  const detail = text.slice(0, arrow);
  return readOracleDice(detail) ? detail.replace(" — ", ": ") + text.slice(arrow) : text;
}

/** "Attack d20+5 -> 19 (14 + 5)": "Attack d20+5". */
export function rolledWhat(roll: string): string {
  return roll.slice(0, roll.lastIndexOf(" -> "));
}

/** "Attack d20+5 -> 19 (14 + 5)": "19". */
export function rolledTotal(roll: string): string {
  return roll.slice(roll.lastIndexOf(" -> ") + 4).split(" ")[0]!;
}

/**
 * The dice of each table rolled, from a table or generator roll's
 * detail ("Ironsworn: Action d100=42", "Action d66=34, Theme d66=25"):
 * a d66 is its two d6. Null if there are none, or any can't be drawn.
 */
export function readTableDice(detail: string): RolledDie[][] | null {
  const groups: RolledDie[][] = [];
  for (const [, count, sides, value] of detail.matchAll(
    /(?<![\p{L}\d])(\d*)d(\d+)(?:=(\d+)(?![\w.]))?/gu,
  )) {
    // Some other dice, or a "d6" in a table's name: it isn't known what came up.
    if (count || value === undefined) return null;
    const dice = tableDice(`d${sides}`, Number(value));
    if (!dice) return null;
    groups.push(dice);
  }
  return groups.length > 0 && canDrawDice(groups.flat()) ? groups : null;
}

/** The dice a table was rolled with, by what came up ("d66", 34: a 3 and a 4). */
export function tableDice(die: string, total: number): RolledDie[] | null {
  const sides = Number(die.slice(1));
  if (die === "d66") {
    const pair = [Math.floor(total / 10), total % 10];
    return pair.every((v) => v >= 1 && v <= 6) ? pair.map((value) => ({ sides: 6, value })) : null;
  }
  return total >= 1 && total <= sides && total < 1000 ? [{ sides, value: total }] : null;
}
