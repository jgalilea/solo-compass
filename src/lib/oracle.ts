/**
 * Engine for the "Recluse" oracle (Graven Utterance, CC BY 4.0).
 *
 * Base rule: roll one white die and one black die (d6).
 * - White > Black  -> Yes
 * - Black > White  -> No
 * - Tie            -> Contradiction: a premise of the question is wrong.
 *
 * Qualifier: if both compared dice are low (<=3) "But" is added; if
 * both are high (>=4) "And" is added. If they're mixed, the answer is
 * plain (no qualifier).
 *
 * Likelihood: for more or less likely events, extra dice of the
 * favoured colour are added and only the highest of that colour is
 * kept for the comparison.
 */

import { makeId } from "./ids";
import type { OracleDiceGroup, OracleId } from "./oracleEngines";

export type Likelihood =
  | "muy-improbable"
  | "improbable"
  | "equilibrado"
  | "probable"
  | "muy-probable";

export type Answer = "si" | "no" | "contradiccion";

export type Qualifier = "y" | "pero" | null;

export interface DiceGroup {
  color: "blanco" | "negro";
  rolls: number[];
  kept: number;
}

export interface OracleRoll {
  kind: "oraculo";
  id: string;
  timestamp: number;
  question: string;
  likelihood: Likelihood;
  /** Which oracle answered (oracleEngines.ts); none: Recluse, saved before there were others. */
  oracle?: OracleId;
  /** Recluse's dice (also kept on new Recluse rolls, for older copies of the app). */
  white?: DiceGroup;
  black?: DiceGroup;
  /** Every die thrown, for any oracle: see `oracleDice`. */
  dice?: OracleDiceGroup[];
  answer: Answer;
  qualifier: Qualifier;
  /** Loner: the dice tied. Ironsworn: a match (extreme result or twist). */
  special?: "double" | "match";
  /**
   * Loner: the Twist Counter after this roll, whether it brought a
   * twist and, if so, what its two tables said ("A third party · Appears").
   */
  twist?: { counter: number; happened: boolean; result?: string };
  favorite: boolean;
}

/** A roll's dice by role, also for Recluse rolls saved with only white/black. */
export function oracleDice(roll: OracleRoll): OracleDiceGroup[] {
  if (roll.dice) return roll.dice;
  return [roll.white, roll.black]
    .filter((g): g is DiceGroup => !!g)
    .map((g) => ({ role: g.color === "blanco" ? "white" : "black", sides: 6, rolls: g.rolls, kept: g.kept }));
}

/** The oracle that answered a roll. */
export function rollOracleId(roll: OracleRoll): OracleId {
  return roll.oracle ?? "recluse";
}

export const LIKELIHOOD_DICE: Record<
  Likelihood,
  { white: number; black: number }
> = {
  "muy-improbable": { white: 1, black: 3 },
  improbable: { white: 1, black: 2 },
  equilibrado: { white: 1, black: 1 },
  probable: { white: 2, black: 1 },
  "muy-probable": { white: 3, black: 1 },
};

function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/** The rule above applied to the already-chosen dice (the highest of each colour). */
export function judgeDice(white: number, black: number): { answer: Answer; qualifier: Qualifier } {
  if (white === black) return { answer: "contradiccion", qualifier: null };
  const answer: Answer = white > black ? "si" : "no";
  if (white <= 3 && black <= 3) return { answer, qualifier: "pero" };
  if (white >= 4 && black >= 4) return { answer, qualifier: "y" };
  return { answer, qualifier: null };
}

export function rollOracle(
  question: string,
  likelihood: Likelihood,
): OracleRoll & { white: DiceGroup; black: DiceGroup } {
  const config = LIKELIHOOD_DICE[likelihood];

  const whiteRolls = Array.from({ length: config.white }, rollDie);
  const blackRolls = Array.from({ length: config.black }, rollDie);

  const whiteKept = Math.max(...whiteRolls);
  const blackKept = Math.max(...blackRolls);

  const { answer, qualifier } = judgeDice(whiteKept, blackKept);

  return {
    kind: "oraculo",
    id: makeId(),
    timestamp: Date.now(),
    question: question.trim(),
    likelihood,
    white: { color: "blanco", rolls: whiteRolls, kept: whiteKept },
    black: { color: "negro", rolls: blackRolls, kept: blackKept },
    answer,
    qualifier,
    favorite: false,
  };
}
