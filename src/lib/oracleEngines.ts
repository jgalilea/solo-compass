/**
 * The yes/no oracles' mechanics, one engine each. An engine says which
 * dice it rolls for a likelihood and how to read them; rolling is
 * throwing those dice, and the odds shown in each oracle's help are
 * worked out by going through every possible throw (`oracleOdds`), so
 * the percentages can never drift from what the app really rolls.
 *
 * - Recluse (Graven Utterance, CC BY 4.0): see oracle.ts.
 * - Loner v2.3 (Roberto Bisceglie, CC BY-SA 4.0): a Chance die against
 *   a Risk die, like Recluse, but a tie is "Yes, but…" and adds to the
 *   Twist Counter (the third one brings a twist). Advantage and
 *   disadvantage add one die of a colour.
 * - Ironsworn's "Ask the Oracle" (Shawn Tomkin, CC BY 4.0, rulebook
 *   p. 107): d100, yes from 11/26/51/76/91 up; a match (11, 22…, 100)
 *   is an extreme result or twist.
 * - One Page Solo Engine v1.6 (Karl Hendricks, CC BY-SA 4.0): an
 *   answer d6 (yes on 3+/4+/5+) and a modifier d6 (1 "but", 6 "and").
 */

import { makeId } from "./ids";
import { judgeDice, LIKELIHOOD_DICE, rollOracle, type Answer, type Likelihood, type OracleRoll, type Qualifier } from "./oracle";

export type OracleId = "recluse" | "loner" | "ironsworn" | "opse";

/** A group of dice of the same kind, as thrown; `kept` is the one that counts. */
export interface OracleDiceGroup {
  /** Which die it is, for its label: see `t.oracleDice`. */
  role: "white" | "black" | "chance" | "risk" | "percentile" | "answer" | "modifier";
  sides: number;
  rolls: number[];
  kept: number;
}

/** The die face each role is drawn on: the "for" side light, the "against" side dark. */
export const ROLE_COLOR: Record<OracleDiceGroup["role"], "blanco" | "negro"> = {
  white: "blanco",
  chance: "blanco",
  answer: "blanco",
  percentile: "blanco",
  black: "negro",
  risk: "negro",
  modifier: "negro",
};

export interface OracleReading {
  answer: Answer;
  qualifier: Qualifier;
  /** Loner: the dice tied (counts toward a twist). Ironsworn: a match. */
  special?: "double" | "match";
}

interface Engine {
  /** The likelihoods it offers, from least to most likely. */
  levels: Likelihood[];
  /** The dice for a likelihood: one group per role. */
  dice: (likelihood: Likelihood) => { role: OracleDiceGroup["role"]; sides: number; count: number }[];
  /** Reads the kept die of each group (same order as `dice`). */
  read: (likelihood: Likelihood, kept: number[]) => OracleReading;
}

const FIVE: Likelihood[] = ["muy-improbable", "improbable", "equilibrado", "probable", "muy-probable"];
const THREE: Likelihood[] = ["improbable", "equilibrado", "probable"];

/** Ironsworn: the lowest roll that answers yes. */
const IRONSWORN_YES_FROM: Record<Likelihood, number> = {
  "muy-improbable": 91,
  improbable: 76,
  equilibrado: 51,
  probable: 26,
  "muy-probable": 11,
};

/** One Page Solo Engine: the lowest answer die that answers yes. */
const OPSE_YES_FROM: Partial<Record<Likelihood, number>> = { improbable: 5, equilibrado: 4, probable: 3 };

const ENGINES: Record<OracleId, Engine> = {
  recluse: {
    levels: FIVE,
    dice: (likelihood) => [
      { role: "white", sides: 6, count: LIKELIHOOD_DICE[likelihood].white },
      { role: "black", sides: 6, count: LIKELIHOOD_DICE[likelihood].black },
    ],
    read: (_, [white, black]) => judgeDice(white, black),
  },
  loner: {
    levels: THREE,
    dice: (likelihood) => [
      { role: "chance", sides: 6, count: likelihood === "probable" ? 2 : 1 },
      { role: "risk", sides: 6, count: likelihood === "improbable" ? 2 : 1 },
    ],
    read: (_, [chance, risk]) => {
      if (chance === risk) return { answer: "si", qualifier: "pero", special: "double" };
      const answer: Answer = chance > risk ? "si" : "no";
      if (chance <= 3 && risk <= 3) return { answer, qualifier: "pero" };
      if (chance >= 4 && risk >= 4) return { answer, qualifier: "y" };
      return { answer, qualifier: null };
    },
  },
  ironsworn: {
    levels: FIVE,
    dice: () => [{ role: "percentile", sides: 100, count: 1 }],
    read: (likelihood, [roll]) => ({
      answer: roll >= IRONSWORN_YES_FROM[likelihood] ? "si" : "no",
      qualifier: null,
      // Two d10 showing the same digit: 11, 22… 99, and 100 (0 and 0).
      ...(roll % 11 === 0 || roll === 100 ? { special: "match" as const } : {}),
    }),
  },
  opse: {
    levels: THREE,
    dice: () => [
      { role: "answer", sides: 6, count: 1 },
      { role: "modifier", sides: 6, count: 1 },
    ],
    read: (likelihood, [answerDie, modifier]) => ({
      answer: answerDie >= (OPSE_YES_FROM[likelihood] ?? 4) ? "si" : "no",
      qualifier: modifier === 1 ? "pero" : modifier === 6 ? "y" : null,
    }),
  },
};

export function oracleLevels(id: OracleId): Likelihood[] {
  return ENGINES[id].levels;
}

/** The likelihood to use with this oracle: the same if it has it, else the middle one. */
export function fitLikelihood(id: OracleId, likelihood: Likelihood): Likelihood {
  return ENGINES[id].levels.includes(likelihood) ? likelihood : "equilibrado";
}

/** The dice an oracle throws for a likelihood, before throwing them: one group per role. */
export function oracleDicePlan(id: OracleId, likelihood: Likelihood): { role: OracleDiceGroup["role"]; count: number }[] {
  return ENGINES[id].dice(likelihood);
}

/** The threshold an oracle states for a likelihood ("51+"), if it has one. */
export function oracleTarget(id: OracleId, likelihood: Likelihood): number | undefined {
  if (id === "ironsworn") return IRONSWORN_YES_FROM[likelihood];
  if (id === "opse") return OPSE_YES_FROM[likelihood];
  return undefined;
}

function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

/** Throws an oracle's dice for a likelihood and reads them. */
export function throwOracle(
  id: OracleId,
  likelihood: Likelihood,
  roll: (sides: number) => number = rollDie,
): OracleReading & { dice: OracleDiceGroup[] } {
  const engine = ENGINES[id];
  const level = fitLikelihood(id, likelihood);
  const dice = engine.dice(level).map(({ role, sides, count }) => {
    const rolls = Array.from({ length: count }, () => roll(sides));
    return { role, sides, rolls, kept: Math.max(...rolls) };
  });
  return { ...engine.read(level, dice.map((d) => d.kept)), dice };
}

export interface OracleOdds {
  yes: number;
  no: number;
  /** "…and" / "…but", whatever the answer. */
  and: number;
  but: number;
  contradiction: number;
  /** Loner's doubles, Ironsworn's matches. */
  special: number;
}

/**
 * The exact chance (0–1) of each outcome, going through every throw of
 * the dice (at most 6⁴ = 1,296 for Recluse's very likely).
 */
export function oracleOdds(id: OracleId, likelihood: Likelihood): OracleOdds {
  const engine = ENGINES[id];
  const groups = engine.dice(likelihood);
  const odds: OracleOdds = { yes: 0, no: 0, and: 0, but: 0, contradiction: 0, special: 0 };
  let total = 0;

  // Every die on its own, then the kept (highest) of each group.
  const dice = groups.flatMap((g, group) => Array.from({ length: g.count }, () => ({ group, sides: g.sides })));
  const values = dice.map(() => 1);
  for (;;) {
    const kept = groups.map((_, group) => Math.max(...values.filter((_, i) => dice[i].group === group)));
    const reading = engine.read(likelihood, kept);
    total += 1;
    if (reading.answer === "si") odds.yes += 1;
    else if (reading.answer === "no") odds.no += 1;
    else odds.contradiction += 1;
    if (reading.qualifier === "y") odds.and += 1;
    if (reading.qualifier === "pero") odds.but += 1;
    if (reading.special) odds.special += 1;

    // Next combination, like an odometer.
    let i = values.length - 1;
    while (i >= 0 && values[i] === dice[i].sides) values[i--] = 1;
    if (i < 0) break;
    values[i] += 1;
  }

  for (const key of Object.keys(odds) as (keyof OracleOdds)[]) odds[key] /= total;
  return odds;
}

/** Loner's Twist Counter after a double: the third one brings a twist and starts again. */
export function nextTwistCounter(previous: number): { counter: number; twist: boolean } {
  const counter = previous + 1;
  return counter >= 3 ? { counter: 0, twist: true } : { counter, twist: false };
}

/**
 * A question to an oracle, as saved in the history. Loner needs its
 * Twist Counter so far (`lonerCounter`, see lonerTwistCounter).
 */
export function rollOracleWith(id: OracleId, question: string, likelihood: Likelihood, lonerCounter = 0): OracleRoll {
  if (id === "recluse") return { ...rollOracle(question, likelihood), oracle: "recluse" };
  const { dice, ...reading } = throwOracle(id, likelihood);
  const twist = reading.special === "double" ? nextTwistCounter(lonerCounter) : undefined;
  return {
    kind: "oraculo",
    id: makeId(),
    timestamp: Date.now(),
    question: question.trim(),
    likelihood: fitLikelihood(id, likelihood),
    oracle: id,
    dice,
    ...reading,
    ...(twist ? { twist: { counter: twist.counter, happened: twist.twist } } : {}),
    favorite: false,
  };
}

/**
 * Loner's Twist Counter so far, read from the history (newest first;
 * usePlayActions passes one adventure's rolls, each has its own):
 * the counter left by the latest double rolled with Loner. Derived,
 * not stored, like everything else that comes from the log.
 */
/** The same, for one adventure's rolls (none: the free rolls'). */
export function lonerTwistCounterOf(
  history: readonly { kind: string; oracle?: string; twist?: { counter: number }; adventureId?: string }[],
  adventureId: string | null | undefined,
): number {
  return lonerTwistCounter(history.filter((h) => (h.adventureId ?? null) === (adventureId ?? null)));
}

export function lonerTwistCounter(history: readonly { kind: string; oracle?: string; twist?: { counter: number } }[]): number {
  return history.find((h) => h.kind === "oraculo" && h.oracle === "loner" && h.twist)?.twist?.counter ?? 0;
}
