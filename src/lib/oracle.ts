/**
 * Motor del oráculo "Recluse" (Graven Utterance, CC BY 4.0).
 *
 * Regla base: se lanza un dado blanco y un dado negro (d6).
 * - Blanco > Negro  -> Sí
 * - Negro > Blanco  -> No
 * - Empate          -> Contradicción: una premisa de la pregunta es errónea.
 *
 * Matiz: si ambos dados comparados son bajos (<=3) se añade "Pero";
 * si ambos son altos (>=4) se añade "Y". Si están mezclados, la
 * respuesta queda seca (sin matiz).
 *
 * Probabilidad: para eventos más o menos probables se añaden dados
 * extra del color favorecido y solo se conserva el más alto de ese
 * color al comparar.
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

export const LIKELIHOOD_LABELS: Record<Likelihood, string> = {
  "muy-improbable": "Muy improbable",
  improbable: "Improbable",
  equilibrado: "Equilibrado",
  probable: "Probable",
  "muy-probable": "Muy probable",
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

export function rollOracle(
  question: string,
  likelihood: Likelihood,
): OracleRoll {
  const config = LIKELIHOOD_DICE[likelihood];

  const whiteRolls = Array.from({ length: config.white }, rollDie);
  const blackRolls = Array.from({ length: config.black }, rollDie);

  const whiteKept = Math.max(...whiteRolls);
  const blackKept = Math.max(...blackRolls);

  let answer: Answer;
  let qualifier: Qualifier = null;

  if (whiteKept === blackKept) {
    answer = "contradiccion";
  } else {
    answer = whiteKept > blackKept ? "si" : "no";
    if (whiteKept <= 3 && blackKept <= 3) {
      qualifier = "pero";
    } else if (whiteKept >= 4 && blackKept >= 4) {
      qualifier = "y";
    }
  }

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
  };
}

export function formatAnswer(roll: Pick<OracleRoll, "answer" | "qualifier">): string {
  const base =
    roll.answer === "si" ? "Sí" : roll.answer === "no" ? "No" : "Contradicción";
  if (!roll.qualifier) return base;
  return roll.qualifier === "y" ? `${base}, y…` : `${base}, pero…`;
}
