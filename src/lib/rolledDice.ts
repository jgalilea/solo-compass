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
export function canDrawDice(dice: readonly RolledDie[]): boolean {
  return dice.length > 0 && dice.length <= MAX_DRAWN_DICE && dice.every((d) => Math.abs(d.value) < 1000);
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
}

/** The dice of an oracle's roll in the journal ("Recluse — blanco 3 / negro 5"); null if it isn't one. */
export function readOracleDice(detail: string): OracleDieRead[] | null {
  const dash = detail.indexOf(" — ");
  if (dash < 0) return null;
  const dice: OracleDieRead[] = [];
  for (const part of detail.slice(dash + 3).split(" / ")) {
    const m = part.match(/^(\S+) (\d+)(?: vs \d+\+)?$/);
    const role = m && ORACLE_DICE[m[1].toLowerCase()];
    if (!role) return null;
    dice.push({ role, sides: role === "percentile" ? 100 : 6, value: Number(m[2]) });
  }
  return dice;
}

/** "Attack d20+5 -> 19 (14 + 5)": "Attack d20+5". */
export function rolledWhat(roll: string): string {
  return roll.slice(0, roll.lastIndexOf(" -> "));
}

/** "Attack d20+5 -> 19 (14 + 5)": "19". */
export function rolledTotal(roll: string): string {
  return roll.slice(roll.lastIndexOf(" -> ") + 4).split(" ")[0];
}
