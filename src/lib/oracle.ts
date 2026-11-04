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
  white: DiceGroup;
  black: DiceGroup;
  answer: Answer;
  qualifier: Qualifier;
  favorite: boolean;
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

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
): OracleRoll {
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
